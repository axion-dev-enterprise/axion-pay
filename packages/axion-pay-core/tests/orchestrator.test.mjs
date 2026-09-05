import assert from 'node:assert/strict';
import test from 'node:test';

import { PaymentOrchestrator } from '../dist/src/core/orchestrator.js';

test('accepts BIGINT amount returned by PostgreSQL as string', async () => {
  const stored = {
    id: 'intent-1',
    merchant_id: 'merchant-1',
    idempotency_key: 'order-1',
    provider: 'woovi',
    correlation_id: 'correlation-1',
    amount_cents: '100',
    status: 'CREATING',
    provider_charge_id: null,
  };
  const queries = [];
  const database = {
    async query(sql) {
      queries.push(sql);
      if (sql.includes('SELECT *')) return { rows: [], rowCount: 0 };
      if (sql.includes('INSERT INTO payment_intents')) return { rows: [stored], rowCount: 1 };
      if (sql.includes('UPDATE payment_intents')) {
        return { rows: [{ ...stored, provider_charge_id: 'charge-1', status: 'ACTIVE' }], rowCount: 1 };
      }
      throw new Error('Unexpected query');
    },
  };
  const provider = {
    name: 'woovi',
    async createCharge() {
      return { providerChargeId: 'charge-1', status: 'ACTIVE', raw: {} };
    },
  };

  const result = await new PaymentOrchestrator(provider, database).createCharge({
    merchantId: 'merchant-1',
    idempotencyKey: 'order-1',
    amountCents: 100,
  });

  assert.equal(result.provider_charge_id, 'charge-1');
  assert.equal(queries.some((sql) => sql.includes('UPDATE payment_intents')), true);
});
