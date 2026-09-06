import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Pool } from 'pg';

type BillingDatabase = Pick<Pool, 'query'>;

type StripeBillingConfig = {
  secretKey?: string;
  priceId?: string;
  webhookSecret?: string;
  appBaseUrl?: string;
};

type DashboardBillingUser = {
  id: string;
  email: string;
  name?: string;
};

type StripeSession = {
  id: string;
  url: string | null;
  expires_at: number;
};

type StripeCustomer = { id: string };

type StripeEvent = {
  id: string;
  type: string;
  created: number;
  data: { object: Record<string, unknown> };
};

export class StripeBillingError extends Error {
  constructor(message: string, readonly statusCode = 502) {
    super(message);
  }
}

function requireBillingConfig(config: StripeBillingConfig): Required<Pick<StripeBillingConfig, 'secretKey' | 'priceId' | 'appBaseUrl'>> & StripeBillingConfig {
  if (!config.secretKey || !config.priceId || !config.appBaseUrl) {
    throw new StripeBillingError('Assinaturas por cartão ainda não estão configuradas.', 503);
  }
  return config as Required<Pick<StripeBillingConfig, 'secretKey' | 'priceId' | 'appBaseUrl'>> & StripeBillingConfig;
}

async function stripeFormRequest<T>(secretKey: string, path: string, form: URLSearchParams, idempotencyKey?: string): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: form.toString(),
    signal: AbortSignal.timeout(10_000),
  });
  const payload = await response.json().catch(() => null) as { error?: { message?: string } } | T | null;
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload
      ? payload.error?.message
      : undefined;
    throw new StripeBillingError(message ? `Stripe recusou a solicitação: ${message}` : 'Não foi possível concluir a solicitação à Stripe.');
  }
  return payload as T;
}

async function getOrCreateCustomer(database: BillingDatabase, config: StripeBillingConfig, user: DashboardBillingUser): Promise<string> {
  const existing = await database.query<{ stripe_customer_id: string }>(
    'SELECT stripe_customer_id FROM gateway_billing_customers WHERE auth_user_id = $1 LIMIT 1',
    [user.id],
  );
  if (existing.rowCount) return existing.rows[0].stripe_customer_id;

  const resolved = requireBillingConfig(config);
  const form = new URLSearchParams({
    email: user.email,
    'metadata[axion_auth_user_id]': user.id,
  });
  if (user.name) form.set('name', user.name);
  const customer = await stripeFormRequest<StripeCustomer>(
    resolved.secretKey,
    'customers',
    form,
    `axion_gateway_customer_${user.id}`,
  );
  const saved = await database.query<{ stripe_customer_id: string }>(
    `INSERT INTO gateway_billing_customers (auth_user_id, stripe_customer_id)
     VALUES ($1, $2)
     ON CONFLICT (auth_user_id) DO UPDATE SET updated_at = NOW()
     RETURNING stripe_customer_id`,
    [user.id, customer.id],
  );
  return saved.rows[0].stripe_customer_id;
}

export async function createSubscriptionCheckout(database: BillingDatabase, config: StripeBillingConfig, user: DashboardBillingUser) {
  const resolved = requireBillingConfig(config);
  const customerId = await getOrCreateCustomer(database, resolved, user);
  const appBaseUrl = resolved.appBaseUrl.replace(/\/$/, '');
  const session = await stripeFormRequest<StripeSession>(
    resolved.secretKey,
    'checkout/sessions',
    new URLSearchParams({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      success_url: `${appBaseUrl}/dashboard?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appBaseUrl}/dashboard?billing=cancelled`,
      'line_items[0][price]': resolved.priceId,
      'line_items[0][quantity]': '1',
      'metadata[axion_auth_user_id]': user.id,
      'subscription_data[metadata][axion_auth_user_id]': user.id,
    }),
    `axion_gateway_checkout_${user.id}_${resolved.priceId}`,
  );
  if (!session.url) throw new StripeBillingError('A Stripe não retornou URL de checkout.');

  await database.query(
    `UPDATE gateway_billing_customers
     SET checkout_session_id = $2, price_id = $3, updated_at = NOW()
     WHERE auth_user_id = $1`,
    [user.id, session.id, resolved.priceId],
  );
  return { checkoutUrl: session.url, expiresAt: new Date(session.expires_at * 1_000).toISOString() };
}

export async function createCustomerPortal(database: BillingDatabase, config: StripeBillingConfig, user: DashboardBillingUser) {
  const resolved = requireBillingConfig(config);
  const customerId = await getOrCreateCustomer(database, resolved, user);
  const portal = await stripeFormRequest<{ url: string }>(
    resolved.secretKey,
    'billing_portal/sessions',
    new URLSearchParams({ customer: customerId, return_url: `${resolved.appBaseUrl.replace(/\/$/, '')}/dashboard?tab=billing` }),
    `axion_gateway_portal_${user.id}`,
  );
  return { portalUrl: portal.url };
}

export async function getBillingStatus(database: BillingDatabase, userId: string) {
  const result = await database.query<{
    subscription_status: string | null;
    price_id: string | null;
    current_period_end: string | null;
  }>(
    `SELECT subscription_status, price_id, current_period_end
     FROM gateway_billing_customers WHERE auth_user_id = $1 LIMIT 1`,
    [userId],
  );
  return result.rowCount ? result.rows[0] : { subscription_status: null, price_id: null, current_period_end: null };
}

function verifyStripeSignature(rawBody: Buffer, signatureHeader: string, secret: string): void {
  const timestamp = signatureHeader.split(',').find((entry) => entry.startsWith('t='))?.slice(2);
  const signatures = signatureHeader.split(',').filter((entry) => entry.startsWith('v1=')).map((entry) => entry.slice(3));
  if (!timestamp || !signatures.length || !/^\d+$/.test(timestamp)) {
    throw new StripeBillingError('Assinatura Stripe inválida.', 401);
  }
  if (Math.abs(Math.floor(Date.now() / 1_000) - Number(timestamp)) > 300) {
    throw new StripeBillingError('Assinatura Stripe expirada.', 401);
  }
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody.toString('utf8')}`).digest('hex');
  const valid = signatures.some((signature) => {
    if (!/^[a-f0-9]{64}$/i.test(signature) || signature.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  });
  if (!valid) throw new StripeBillingError('Assinatura Stripe inválida.', 401);
}

export async function ingestStripeWebhook(database: BillingDatabase, config: StripeBillingConfig, rawBody: Buffer, signatureHeader: string) {
  if (!config.webhookSecret) throw new StripeBillingError('Webhook Stripe não está configurado.', 503);
  verifyStripeSignature(rawBody, signatureHeader, config.webhookSecret);
  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody.toString('utf8')) as StripeEvent;
  } catch {
    throw new StripeBillingError('Evento Stripe inválido.', 400);
  }
  if (!event.id || !event.type || typeof event.created !== 'number' || !event.data?.object || Array.isArray(event.data.object)) {
    throw new StripeBillingError('Evento Stripe inválido.', 400);
  }

  const object = event.data.object;
  const customerId = typeof object.customer === 'string' ? object.customer : null;
  const subscriptionId = typeof object.subscription === 'string' ? object.subscription : (typeof object.id === 'string' && event.type.startsWith('customer.subscription.') ? object.id : null);
  const inserted = await database.query(
    `INSERT INTO gateway_stripe_webhook_events (stripe_event_id, event_type, stripe_customer_id, stripe_subscription_id, event_created_at)
     VALUES ($1, $2, $3, $4, to_timestamp($5)) ON CONFLICT (stripe_event_id) DO NOTHING`,
    [event.id, event.type, customerId, subscriptionId, event.created],
  );
  if (!inserted.rowCount) return { received: true, duplicate: true };

  if (event.type.startsWith('payment_intent.') && typeof object.id === 'string') {
    const paymentStatus = typeof object.status === 'string' ? object.status.toUpperCase() : 'PROCESSING';
    const paymentIntent = await database.query<{ id: string; amount_cents: string }>(
      `UPDATE payment_intents SET status = $2, updated_at = NOW()
        WHERE provider = 'stripe' AND provider_charge_id = $1
        RETURNING id, amount_cents`,
      [object.id, paymentStatus],
    );
    if (event.type === 'payment_intent.succeeded' && paymentIntent.rowCount) {
      await database.query(
        `INSERT INTO financial_transactions
          (payment_intent_id, provider, provider_transaction_id, amount_cents, direction, status, occurred_at)
         VALUES ($1, 'stripe', $2, $3, 'CREDIT', 'CONFIRMED', to_timestamp($4))
         ON CONFLICT (provider, provider_transaction_id) DO NOTHING`,
        [paymentIntent.rows[0].id, object.id, paymentIntent.rows[0].amount_cents, event.created],
      );
    }
  }

  if (customerId && (event.type === 'checkout.session.completed' || event.type.startsWith('customer.subscription.'))) {
    const status = typeof object.status === 'string' ? object.status : (event.type === 'checkout.session.completed' ? 'checkout_completed' : null);
    const periodEnd = typeof object.current_period_end === 'number' ? object.current_period_end : null;
    await database.query(
      `UPDATE gateway_billing_customers
       SET stripe_subscription_id = COALESCE($2, stripe_subscription_id),
           subscription_status = COALESCE($3, subscription_status),
           current_period_end = CASE WHEN $4::bigint IS NULL THEN current_period_end ELSE to_timestamp($4) END,
           updated_at = NOW()
       WHERE stripe_customer_id = $1`,
      [customerId, subscriptionId, status, periodEnd],
    );
  }
  return { received: true, duplicate: false };
}
