import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import {
  createSubscriptionCheckout,
  ingestStripeWebhook,
  StripeBillingError,
} from '../dist/src/services/stripe-billing.service.js';

const billingConfig = {
  secretKey: 'sk_test_local_test_key',
  priceId: 'price_test_monthly',
  webhookSecret: 'whsec_test_signing_secret',
  appBaseUrl: 'https://pay.axionenterprise.cloud',
};

function signedPayload(payload) {
  const body = Buffer.from(JSON.stringify(payload));
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', billingConfig.webhookSecret)
    .update(`${timestamp}.${body.toString('utf8')}`)
    .digest('hex');
  return { body, header: `t=${timestamp},v1=${signature}` };
}

test('checkout de assinatura falha fechado quando Stripe não está configurada', async () => {
  await assert.rejects(
    () => createSubscriptionCheckout(
      { async query() { throw new Error('o banco não deve ser usado'); } },
      { appBaseUrl: billingConfig.appBaseUrl },
      { id: 'auth-user-1', email: 'merchant@example.com' },
    ),
    (error) => error instanceof StripeBillingError && error.statusCode === 503,
  );
});

test('webhook Stripe rejeita assinatura inválida antes de persistir qualquer evento', async () => {
  let queries = 0;
  await assert.rejects(
    () => ingestStripeWebhook(
      { async query() { queries += 1; return { rowCount: 1, rows: [] }; } },
      billingConfig,
      Buffer.from(JSON.stringify({ id: 'evt_invalid', type: 'checkout.session.completed', created: Math.floor(Date.now() / 1000), data: { object: {} } })),
      't=1,v1=00',
    ),
    (error) => error instanceof StripeBillingError && error.statusCode === 401,
  );
  assert.equal(queries, 0);
});

test('webhook Stripe assinado deduplica o evento e atualiza apenas o estado mínimo da assinatura', async () => {
  const calls = [];
  const event = {
    id: 'evt_subscription_active',
    type: 'customer.subscription.updated',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'sub_gateway_monthly',
        customer: 'cus_gateway_customer',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 2_592_000,
      },
    },
  };
  const { body, header } = signedPayload(event);
  const database = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (sql.includes('INSERT INTO gateway_stripe_webhook_events')) return { rowCount: 1, rows: [] };
      if (sql.includes('UPDATE gateway_billing_customers')) return { rowCount: 1, rows: [] };
      throw new Error(`Consulta inesperada: ${sql}`);
    },
  };

  const result = await ingestStripeWebhook(database, billingConfig, body, header);

  assert.deepEqual(result, { received: true, duplicate: false });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].values.includes('evt_subscription_active'), true);
  assert.equal(calls[0].values.some((value) => typeof value === 'string' && value.includes('merchant@example.com')), false);
  assert.match(calls[1].sql, /subscription_status/);
  assert.equal(calls[1].values[1], 'sub_gateway_monthly');
  assert.equal(calls[1].values[2], 'active');
});
