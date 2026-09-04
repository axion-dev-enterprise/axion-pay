import assert from 'node:assert/strict';
import test from 'node:test';
import { FlowBillingService } from '../dist/src/services/flow-billing.service.js';

test('billing do Flow começa sem entitlement e sem inventar assinatura', async () => {
  const database = { async query() { return { rows: [], rowCount: 0 }; } };
  const billing = new FlowBillingService(database);
  const status = await billing.getStatus('auth-user-1');

  assert.deepEqual(status, {
    configured: false,
    status: 'NOT_STARTED',
    entitled: false,
    trialEndsAt: null,
    currentPeriodEndsAt: null,
    cancelAtPeriodEnd: false,
    trialDays: 7,
  });
});

test('checkout não é oferecido quando Stripe não está configurado', async () => {
  const database = { async query() { throw new Error('não deve consultar o banco sem Stripe configurado'); } };
  const billing = new FlowBillingService(database);

  await assert.rejects(
    () => billing.createCheckout({ id: 'auth-user-1', email: 'user@example.com' }, 'starter'),
    /Cobrança do Flow ainda não foi configurada/,
  );
});
