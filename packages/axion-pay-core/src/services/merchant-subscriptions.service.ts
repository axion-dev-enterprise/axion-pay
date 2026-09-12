import Stripe from 'stripe';
import type { Pool } from 'pg';
import { dispatchMerchantEventAsync } from './merchant-webhook-dispatcher.service.js';

type Database = Pick<Pool, 'query'>;

export type CreateMerchantSubscriptionParams = {
  customerEmail: string;
  customerName?: string;
  amountCents: number;
  interval?: 'month' | 'year';
  currency?: string;
  paymentMethodId?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
};

export type MerchantSubscription = {
  id: string;
  merchantId: string;
  customerEmail: string;
  customerName: string | null;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  amountCents: number;
  currency: string;
  interval: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  checkoutUrl?: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export class MerchantSubscriptionError extends Error {
  constructor(message: string, readonly statusCode = 400) {
    super(message);
  }
}

export async function createMerchantSubscription(
  database: Database,
  stripe: Stripe,
  merchantId: string,
  params: CreateMerchantSubscriptionParams,
): Promise<MerchantSubscription> {
  const amountCents = Math.round(params.amountCents);
  if (!amountCents || amountCents < 100) {
    throw new MerchantSubscriptionError('amountCents deve ser no mínimo 100 (R$ 1,00).', 400);
  }

  const interval = params.interval === 'year' ? 'year' : 'month';
  const currency = (params.currency || 'BRL').toLowerCase();

  // 1. Cria ou recupera cliente no Stripe
  let stripeCustomerId: string;
  const existingSub = await database.query<{ stripe_customer_id: string }>(
    `SELECT stripe_customer_id FROM merchant_subscriptions
     WHERE merchant_id = $1 AND customer_email = $2 LIMIT 1`,
    [merchantId, params.customerEmail.toLowerCase().trim()],
  );

  if (existingSub.rowCount) {
    stripeCustomerId = existingSub.rows[0].stripe_customer_id;
  } else {
    const customer = await stripe.customers.create({
      email: params.customerEmail.toLowerCase().trim(),
      name: params.customerName || undefined,
      metadata: {
        axion_merchant_id: merchantId,
      },
    });
    stripeCustomerId = customer.id;
  }

  // 2. Cria preço recorrente no Stripe
  const price = await stripe.prices.create({
    unit_amount: amountCents,
    currency,
    recurring: { interval },
    product_data: {
      name: `Assinatura Recorrente (${interval === 'month' ? 'Mensal' : 'Anual'})`,
      metadata: { axion_merchant_id: merchantId },
    },
  });

  let stripeSubscriptionId: string;
  let status: string = 'ACTIVE';
  let currentPeriodEnd: Date | null = null;
  let checkoutUrl: string | null = null;

  if (params.paymentMethodId) {
    // Anexa método de pagamento e inicia assinatura direta
    await stripe.paymentMethods.attach(params.paymentMethodId, { customer: stripeCustomerId });
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: params.paymentMethodId },
    });

    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: price.id }],
      default_payment_method: params.paymentMethodId,
      metadata: {
        axion_merchant_id: merchantId,
        customer_email: params.customerEmail,
      },
      expand: ['latest_invoice.payment_intent'],
    });

    stripeSubscriptionId = subscription.id;
    status = subscription.status.toUpperCase();
    const periodEndSec = (subscription as any).current_period_end;
    currentPeriodEnd = periodEndSec ? new Date(periodEndSec * 1000) : null;
  } else {
    // Cria sessão de checkout para captura do cartão de crédito
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: price.id, quantity: 1 }],
      locale: 'pt-BR',
      adaptive_pricing: { enabled: false },
      success_url: `https://pay.axionenterprise.cloud/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://pay.axionenterprise.cloud/checkout/cancel`,
      metadata: {
        axion_merchant_id: merchantId,
        customer_email: params.customerEmail,
      },
      subscription_data: {
        metadata: {
          axion_merchant_id: merchantId,
          customer_email: params.customerEmail,
        },
      },
    });

    stripeSubscriptionId = `sub_pending_${session.id}`;
    checkoutUrl = session.url;
    status = 'PENDING';
  }

  // 3. Salva no banco relacional
  const inserted = await database.query<{
    id: string;
    merchant_id: string;
    customer_email: string;
    customer_name: string | null;
    stripe_customer_id: string;
    stripe_subscription_id: string;
    status: string;
    amount_cents: string;
    currency: string;
    interval: string;
    current_period_end: Date | null;
    cancel_at_period_end: boolean;
    metadata: Record<string, unknown> | null;
    created_at: Date;
  }>(
    `INSERT INTO merchant_subscriptions (
       merchant_id, customer_email, customer_name, stripe_customer_id,
       stripe_subscription_id, amount_cents, currency, interval, status,
       current_period_end, cancel_at_period_end, metadata
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, $11)
     RETURNING *`,
    [
      merchantId,
      params.customerEmail.toLowerCase().trim(),
      params.customerName || null,
      stripeCustomerId,
      stripeSubscriptionId,
      amountCents,
      currency.toUpperCase(),
      interval,
      status,
      currentPeriodEnd,
      params.metadata ? JSON.stringify(params.metadata) : null,
    ],
  );

  const row = inserted.rows[0];
  const responseData: MerchantSubscription = {
    id: row.id,
    merchantId: row.merchant_id,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    status: row.status,
    amountCents: Number(row.amount_cents),
    currency: row.currency,
    interval: row.interval,
    currentPeriodEnd: row.current_period_end ? row.current_period_end.toISOString() : null,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    checkoutUrl,
    metadata: row.metadata,
    createdAt: row.created_at.toISOString(),
  };

  // Dispara webhook outbound para o merchant
  dispatchMerchantEventAsync(database, merchantId, 'subscription.created', responseData as unknown as Record<string, unknown>);

  return responseData;
}

export async function getMerchantSubscription(
  database: Database,
  merchantId: string,
  subscriptionId: string,
): Promise<MerchantSubscription> {
  const result = await database.query<{
    id: string;
    merchant_id: string;
    customer_email: string;
    customer_name: string | null;
    stripe_customer_id: string;
    stripe_subscription_id: string;
    status: string;
    amount_cents: string;
    currency: string;
    interval: string;
    current_period_end: Date | null;
    cancel_at_period_end: boolean;
    metadata: Record<string, unknown> | null;
    created_at: Date;
  }>(
    `SELECT * FROM merchant_subscriptions WHERE id = $1 AND merchant_id = $2`,
    [subscriptionId, merchantId],
  );

  if (!result.rowCount) {
    throw new MerchantSubscriptionError('Assinatura não encontrada.', 404);
  }

  const row = result.rows[0];
  return {
    id: row.id,
    merchantId: row.merchant_id,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    status: row.status,
    amountCents: Number(row.amount_cents),
    currency: row.currency,
    interval: row.interval,
    currentPeriodEnd: row.current_period_end ? row.current_period_end.toISOString() : null,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    metadata: row.metadata,
    createdAt: row.created_at.toISOString(),
  };
}

export async function cancelMerchantSubscription(
  database: Database,
  stripe: Stripe,
  merchantId: string,
  subscriptionId: string,
  immediately = false,
): Promise<MerchantSubscription> {
  const existing = await getMerchantSubscription(database, merchantId, subscriptionId);

  if (existing.status === 'CANCELED') {
    return existing;
  }

  if (existing.stripeSubscriptionId && !existing.stripeSubscriptionId.startsWith('sub_pending_')) {
    if (immediately) {
      await stripe.subscriptions.cancel(existing.stripeSubscriptionId);
    } else {
      await stripe.subscriptions.update(existing.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }
  }

  const updatedStatus = immediately ? 'CANCELED' : existing.status;
  const updatedCancelAtPeriodEnd = !immediately;

  await database.query(
    `UPDATE merchant_subscriptions
     SET status = $1, cancel_at_period_end = $2, updated_at = NOW()
     WHERE id = $3 AND merchant_id = $4`,
    [updatedStatus, updatedCancelAtPeriodEnd, subscriptionId, merchantId],
  );

  const canceledData: MerchantSubscription = {
    ...existing,
    status: updatedStatus,
    cancelAtPeriodEnd: updatedCancelAtPeriodEnd,
  };

  dispatchMerchantEventAsync(database, merchantId, 'subscription.canceled', canceledData as unknown as Record<string, unknown>);

  return canceledData;
}

export async function renewMerchantSubscriptionCheckout(
  database: Database,
  stripe: Stripe,
  merchantId: string,
  subscriptionId: string,
): Promise<{
  id: string;
  checkoutUrl: string | null;
  status: string;
  message: string;
}> {
  const existing = await getMerchantSubscription(database, merchantId, subscriptionId);

  if (existing.status === 'ACTIVE') {
    return {
      id: existing.id,
      checkoutUrl: null,
      status: existing.status,
      message: 'Assinatura já está ativa e com pagamento confirmado.',
    };
  }

  // Cria preço para a nova Checkout Session
  const price = await stripe.prices.create({
    unit_amount: existing.amountCents,
    currency: existing.currency,
    recurring: { interval: existing.interval as 'month' | 'year' },
    product_data: {
      name: `Assinatura Recorrente (${existing.interval === 'month' ? 'Mensal' : 'Anual'})`,
      metadata: { axion_merchant_id: merchantId },
    },
  });

  // Cria nova sessão de checkout sem duplicar o contrato ou cliente
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: existing.stripeCustomerId,
    line_items: [{ price: price.id, quantity: 1 }],
    locale: 'pt-BR',
    adaptive_pricing: { enabled: false },
    success_url: `https://pay.axionenterprise.cloud/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `https://pay.axionenterprise.cloud/checkout/cancel`,
    metadata: {
      axion_merchant_id: merchantId,
      customer_email: existing.customerEmail,
      subscription_id: existing.id,
    },
    subscription_data: {
      metadata: {
        axion_merchant_id: merchantId,
        customer_email: existing.customerEmail,
        subscription_id: existing.id,
      },
    },
  });

  const newStripeSubId = `sub_pending_${session.id}`;
  await database.query(
    `UPDATE merchant_subscriptions
        SET stripe_subscription_id = $1,
            status = 'PENDING',
            updated_at = NOW()
      WHERE id = $2 AND merchant_id = $3`,
    [newStripeSubId, subscriptionId, merchantId],
  );

  return {
    id: existing.id,
    checkoutUrl: session.url,
    status: 'PENDING',
    message: 'Checkout renovado com sucesso. Link pronto para envio ao cliente.',
  };
}

