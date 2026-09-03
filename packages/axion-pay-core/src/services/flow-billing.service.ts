import Stripe from 'stripe';
import type { Pool } from 'pg';
import { config } from '../config.js';
import type { DashboardUser } from './dashboard.service.js';

type Database = Pick<Pool, 'query' | 'connect'>;

export type FlowBillingStatus = {
  configured: boolean;
  status: string;
  entitled: boolean;
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  trialDays: number;
};

function iso(value: number | null | undefined): string | null {
  return value ? new Date(value * 1_000).toISOString() : null;
}

function toStatus(row: Record<string, unknown> | undefined): FlowBillingStatus {
  const status = String(row?.subscription_status ?? 'NOT_STARTED');
  return {
    configured: config.STRIPE_ENABLED,
    status,
    entitled: status === 'active' || status === 'trialing',
    trialEndsAt: row?.trial_ends_at ? new Date(String(row.trial_ends_at)).toISOString() : null,
    currentPeriodEndsAt: row?.current_period_ends_at ? new Date(String(row.current_period_ends_at)).toISOString() : null,
    cancelAtPeriodEnd: Boolean(row?.cancel_at_period_end),
    trialDays: 7,
  };
}

export class FlowBillingService {
  private readonly stripe: Stripe | null;

  constructor(private readonly database: Database, stripe?: Stripe | null) {
    this.stripe = stripe ?? (config.STRIPE_ENABLED && config.STRIPE_SECRET_KEY
      ? new Stripe(config.STRIPE_SECRET_KEY)
      : null);
  }

  private requireStripe(): Stripe {
    if (!this.stripe || !config.STRIPE_FLOW_PRICE_ID) {
      const error = new Error('Cobrança do Flow ainda não foi configurada.');
      (error as Error & { statusCode?: number }).statusCode = 503;
      throw error;
    }
    return this.stripe;
  }

  async getStatus(userId: string): Promise<FlowBillingStatus> {
    const result = await this.database.query(
      `SELECT subscription_status, trial_ends_at, current_period_ends_at, cancel_at_period_end
         FROM flow_billing_accounts WHERE auth_user_id = $1`,
      [userId],
    );
    return toStatus(result.rows[0]);
  }

  async createCheckout(user: DashboardUser): Promise<{ checkoutUrl: string; status: FlowBillingStatus }> {
    const stripe = this.requireStripe();
    const existing = await this.database.query<{ stripe_customer_id: string; subscription_status: string }>(
      `SELECT stripe_customer_id, subscription_status FROM flow_billing_accounts WHERE auth_user_id = $1`,
      [user.id],
    );
    const row = existing.rows[0];
    if (row && ['active', 'trialing', 'past_due'].includes(row.subscription_status)) {
      const error = new Error('A assinatura já existe. Use o portal de cobrança para gerenciá-la.');
      (error as Error & { statusCode?: number }).statusCode = 409;
      throw error;
    }

    const customerId = row?.stripe_customer_id ?? (await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { axion_auth_user_id: user.id, product: 'axion_flow' },
    })).id;

    await this.database.query(
      `INSERT INTO flow_billing_accounts (auth_user_id, stripe_customer_id)
       VALUES ($1, $2)
       ON CONFLICT (auth_user_id) DO UPDATE SET stripe_customer_id = EXCLUDED.stripe_customer_id, updated_at = NOW()`,
      [user.id, customerId],
    );

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: config.STRIPE_FLOW_PRICE_ID, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { axion_auth_user_id: user.id, product: 'axion_flow' },
      },
      metadata: { axion_auth_user_id: user.id, product: 'axion_flow' },
      success_url: config.STRIPE_FLOW_SUCCESS_URL,
      cancel_url: config.STRIPE_FLOW_CANCEL_URL,
      allow_promotion_codes: true,
    });
    if (!session.url) throw new Error('Stripe não retornou uma URL de checkout.');
    return { checkoutUrl: session.url, status: await this.getStatus(user.id) };
  }

  async createPortal(userId: string): Promise<{ portalUrl: string }> {
    const stripe = this.requireStripe();
    const result = await this.database.query<{ stripe_customer_id: string }>(
      `SELECT stripe_customer_id FROM flow_billing_accounts WHERE auth_user_id = $1`, [userId],
    );
    const customerId = result.rows[0]?.stripe_customer_id;
    if (!customerId) {
      const error = new Error('Nenhuma conta de cobrança foi iniciada para este usuário.');
      (error as Error & { statusCode?: number }).statusCode = 404;
      throw error;
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: 'https://flow.axionenterprise.cloud/dashboard',
    });
    return { portalUrl: session.url };
  }

  async ingestWebhook(rawBody: Buffer, signature: string): Promise<{ received: true }> {
    const stripe = this.requireStripe();
    if (!config.STRIPE_WEBHOOK_SECRET) throw new Error('Webhook Stripe não configurado.');
    const event = stripe.webhooks.constructEvent(rawBody, signature, config.STRIPE_WEBHOOK_SECRET);
    const inserted = await this.database.query(
      `INSERT INTO flow_billing_events (stripe_event_id, event_type)
       VALUES ($1, $2) ON CONFLICT (stripe_event_id) DO NOTHING RETURNING stripe_event_id`,
      [event.id, event.type],
    );
    if (!inserted.rowCount) return { received: true };

    try {
      if (event.type.startsWith('customer.subscription.')) {
        await this.syncSubscription(event.data.object as Stripe.Subscription);
      }
      await this.database.query(
        'UPDATE flow_billing_events SET processed_at = NOW() WHERE stripe_event_id = $1', [event.id],
      );
      return { received: true };
    } catch (error) {
      await this.database.query(
        'UPDATE flow_billing_events SET processing_error = $2 WHERE stripe_event_id = $1',
        [event.id, error instanceof Error ? error.message.slice(0, 500) : 'unknown'],
      );
      throw error;
    }
  }

  private async syncSubscription(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata.axion_auth_user_id;
    if (!userId || subscription.metadata.product !== 'axion_flow') return;
    await this.database.query(
      `UPDATE flow_billing_accounts
          SET stripe_subscription_id = $2,
              subscription_status = $3,
              trial_ends_at = to_timestamp($4),
              current_period_ends_at = to_timestamp($5),
              cancel_at_period_end = $6,
              updated_at = NOW()
        WHERE auth_user_id = $1`,
      [
        userId,
        subscription.id,
        subscription.status,
        subscription.trial_end ?? null,
        subscription.items.data[0]?.current_period_end ?? null,
        subscription.cancel_at_period_end,
      ],
    );
  }
}
