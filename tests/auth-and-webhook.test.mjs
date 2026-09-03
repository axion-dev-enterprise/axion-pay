import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import test from 'node:test';
import {
  authenticateApiKey,
  hasScopes,
  readPresentedApiKey,
} from '../dist/src/services/auth.service.js';
import {
  extractWebhookDetails,
  normalizePaymentStatus,
} from '../dist/src/services/webhook.service.js';
import { buildApp } from '../dist/src/app.js';
import { PaymentOrchestrator } from '../dist/src/core/orchestrator.js';
import { WooviWebhookService } from '../dist/src/services/webhook.service.js';

const key = 'axion_test_key_abcdefghijklmnopqrstuvwxyz';
const execFileAsync = promisify(execFile);

test('autentica chave de API, resolve merchant e respeita escopos', () => {
  const keys = [{
    secret: key,
    merchantId: 'merchant-a',
    scopes: new Set(['charges:read', 'charges:write']),
  }];
  const principal = authenticateApiKey(key, keys);

  assert.ok(principal);
  assert.equal(principal.merchantId, 'merchant-a');
  assert.equal(hasScopes(principal, ['charges:read']), true);
  assert.equal(hasScopes(principal, ['reconciliation:read']), false);
  assert.equal(authenticateApiKey('chave-incorreta', keys), null);
  assert.equal(readPresentedApiKey({ authorization: `Bearer ${key}` }), key);
});

test('normaliza eventos de pagamento Woovi e extrai os identificadores de conciliação', () => {
  const details = extractWebhookDetails({
    event: { id: 'evt_123', type: 'OPENPIX:CHARGE_COMPLETED' },
    charge: {
      correlationID: 'f2244de0-4cab-4f1f-b707-49e9c8cc97f6',
      status: 'COMPLETED',
      value: 1990,
      transactions: [{ id: 'txn_123', endToEndId: 'E1234567890123456789012345678901' }],
    },
  });

  assert.deepEqual(details, {
    correlationId: 'f2244de0-4cab-4f1f-b707-49e9c8cc97f6',
    externalEventId: 'evt_123',
    eventType: 'OPENPIX:CHARGE_COMPLETED',
    providerTransactionId: 'txn_123',
    endToEndId: 'E1234567890123456789012345678901',
    amountCents: 1990,
    status: 'PAID',
  });
  assert.equal(normalizePaymentStatus('EXPIRED'), 'EXPIRED');
  assert.equal(normalizePaymentStatus('unexpected'), undefined);
  assert.equal(normalizePaymentStatus('OPENPIX:CHARGE_COMPLETED'), 'PAID');
});

test('superfície pública exige chave e não publica rotas de reconciliação por padrão', async () => {
  const app = await buildApp();
  try {
    const chargeResponse = await app.inject({
      method: 'POST',
      url: '/v1/charges',
      payload: { amountCents: 1990 },
    });
    const internalResponse = await app.inject({ method: 'POST', url: '/internal/reconcile/nubank' });
    const openApiResponse = await app.inject({ method: 'GET', url: '/openapi.json' });

    assert.equal(chargeResponse.statusCode, 401);
    assert.equal(internalResponse.statusCode, 404);
    assert.equal(openApiResponse.statusCode, 200);
    assert.equal(JSON.parse(openApiResponse.payload).openapi, '3.1.0');
  } finally {
    await app.close();
  }
});

test('health propaga X-Trace-ID para rastrear atendimento sem expor sessão', async () => {
  const database = { async query() { return { rows: [{ ok: 1 }], rowCount: 1 }; } };
  const cache = { async ping() { return 'PONG'; }, async incr() { return 1; }, async expire() { return 1; } };
  const app = await buildApp({ database, cache, provider: { name: 'woovi' } });
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-trace-id': 'trace-contract-20260901' },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['x-trace-id'], 'trace-contract-20260901');
    assert.match(response.payload, /"status":"ok"/);
  } finally {
    await app.close();
  }
});

test('CORS permite salvar onboarding com PUT a partir do dashboard AXION', async () => {
  const database = { async query() { return { rows: [{ ok: 1 }], rowCount: 1 }; } };
  const cache = { async ping() { return 'PONG'; }, async incr() { return 1; }, async expire() { return 1; } };
  const app = await buildApp({ database, cache, provider: { name: 'woovi' } });
  try {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/v1/dashboard/onboarding',
      headers: {
        origin: 'https://pay.axionenterprise.cloud',
        'access-control-request-method': 'PUT',
      },
    });
    assert.equal(response.statusCode, 204);
    assert.match(response.headers['access-control-allow-methods'], /\bPUT\b/);
  } finally {
    await app.close();
  }
});

test('webhook preserva o corpo bruto e exige assinatura antes de processar', async () => {
  const database = { async query() { return { rows: [], rowCount: 0 }; } };
  const cache = { async ping() { return 'PONG'; }, async incr() { return 1; }, async expire() { return 1; } };
  const provider = { name: 'woovi', async verifyWebhook() { throw new Error('não deve verificar sem assinatura'); } };
  const app = await buildApp({ database, cache, provider });
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/woovi',
      payload: { event: 'OPENPIX:CHARGE_COMPLETED' },
    });

    assert.equal(response.statusCode, 401);
    assert.match(response.payload, /x-webhook-signature ausente/);
  } finally {
    await app.close();
  }
});

test('persiste a intenção antes de chamar o provedor e reutiliza o resultado idempotente', async () => {
  const intent = {
    id: 'b2ed59c3-6e72-49cf-af65-401d5cb1f93d',
    merchant_id: 'merchant-a',
    idempotency_key: 'order-101',
    provider: 'woovi',
    correlation_id: 'd3e34485-8d93-4630-857e-010fca0fc60f',
    provider_charge_id: null,
    amount_cents: 1990,
    status: 'CREATING',
  };
  const queries = [];
  const database = {
    async query(sql, values) {
      queries.push({ sql, values });
      if (sql.includes('FROM payment_intents')) return { rows: [], rowCount: 0 };
      if (sql.includes('INSERT INTO payment_intents')) return { rows: [intent], rowCount: 1 };
      if (sql.includes('UPDATE payment_intents')) return { rows: [{ ...intent, provider_charge_id: 'charge-101', status: 'ACTIVE' }], rowCount: 1 };
      throw new Error(`Consulta inesperada: ${sql}`);
    },
  };
  let providerInput;
  const provider = {
    name: 'woovi',
    async createCharge(input) {
      providerInput = input;
      return { provider: 'woovi', providerChargeId: 'charge-101', correlationId: input.correlationId, status: 'ACTIVE', amountCents: 1990, raw: {} };
    },
  };

  const orchestrator = new PaymentOrchestrator(provider, database);
  const result = await orchestrator.createCharge({ merchantId: 'merchant-a', idempotencyKey: 'order-101', amountCents: 1990 });

  assert.equal(queries[0].sql.includes('FROM payment_intents'), true);
  assert.equal(queries[1].sql.includes('INSERT INTO payment_intents'), true);
  assert.equal(providerInput.correlationId, intent.correlation_id);
  assert.equal(result.provider_charge_id, 'charge-101');
});

test('evento pago válido atualiza a intenção e registra a transação financeira', async () => {
  const calls = [];
  const client = {
    async query(sql, values = []) {
      calls.push({ sql, values });
      if (sql === 'BEGIN' || sql === 'COMMIT') return { rows: [], rowCount: 0 };
      if (sql.includes('INSERT INTO webhook_events')) return { rows: [{ id: 'evt-local' }], rowCount: 1 };
      if (sql.includes('UPDATE payment_intents')) return { rows: [{ id: 'intent-local', amount_cents: 1990 }], rowCount: 1 };
      if (sql.includes('INSERT INTO financial_transactions') || sql.includes('UPDATE webhook_events')) return { rows: [], rowCount: 1 };
      throw new Error(`Consulta inesperada: ${sql}`);
    },
    release() {},
  };
  const database = { async connect() { return client; } };
  const provider = { async verifyWebhook() { return true; } };
  const service = new WooviWebhookService(provider, database);
  const body = Buffer.from(JSON.stringify({
    event: 'OPENPIX:CHARGE_COMPLETED',
    id: 'provider-event-1',
    charge: {
      correlationID: 'bead7a6b-fb36-43d2-85a0-5adc1788ab2d',
      status: 'COMPLETED',
      value: 1990,
      transactions: [{ id: 'provider-txn-1', endToEndId: 'E1234567890123456789012345678901' }],
    },
  }));

  const result = await service.ingest(body, 'signature');

  assert.equal(result.processed, true);
  assert.equal(calls.some((call) => call.sql.includes('UPDATE payment_intents') && call.values[0] === 'PAID'), true);
  assert.equal(calls.some((call) => call.sql.includes('INSERT INTO financial_transactions') && call.sql.includes("'CREDIT'")), true);
});

test('webhook não permite ressuscitar cobrança reembolsada nem aceitar valor divergente', async () => {
  const calls = [];
  const client = {
    async query(sql, values = []) {
      calls.push({ sql, values });
      if (sql === 'BEGIN' || sql === 'COMMIT') return { rows: [], rowCount: 0 };
      if (sql.includes('INSERT INTO webhook_events')) return { rows: [{ id: 'evt-local' }], rowCount: 1 };
      if (sql.includes('UPDATE payment_intents')) return { rows: [], rowCount: 0 };
      if (sql.includes('UPDATE webhook_events')) return { rows: [], rowCount: 1 };
      throw new Error(`Consulta inesperada: ${sql}`);
    },
    release() {},
  };
  const service = new WooviWebhookService(
    { async verifyWebhook() { return true; } },
    { async connect() { return client; } },
  );
  const body = Buffer.from(JSON.stringify({
    event: 'OPENPIX:CHARGE_COMPLETED',
    id: 'provider-event-late',
    charge: {
      correlationID: 'd1d4d221-ddc3-4b15-b88b-acb15953011b',
      status: 'COMPLETED',
      value: 1990,
      transactions: [{ id: 'provider-txn-late' }],
    },
  }));

  const result = await service.ingest(body, 'signature');
  const update = calls.find((call) => call.sql.includes('UPDATE payment_intents'));

  assert.equal(result.processed, false);
  assert.match(result.processingError, /valor divergente ou transição inválida/);
  assert.match(update.sql, /status = 'REFUNDED'/);
  assert.match(update.sql, /amount_cents = \$3::bigint/);
  assert.equal(update.values[2], 1990);
});

test('endpoint de cobrança autentica a chave e responde com contrato público', async () => {
  const appUrl = new URL('../dist/src/app.js', import.meta.url).href;
  const script = `
    import { buildApp } from ${JSON.stringify(appUrl)};
    const intent = { id: '0ef7e3b3-a9d1-4868-b56a-57f6daaaf569', merchant_id: 'merchant-a', idempotency_key: 'order-smoke', provider: 'woovi', correlation_id: '8e95b627-d409-48af-8d03-a1745fdaed1f', provider_charge_id: null, amount_cents: 1990, currency: 'BRL', status: 'CREATING', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' };
    const database = { async query(sql) {
      if (sql.includes('FROM payment_intents')) return { rows: [], rowCount: 0 };
      if (sql.includes('INSERT INTO payment_intents')) return { rows: [intent], rowCount: 1 };
      if (sql.includes('UPDATE payment_intents')) return { rows: [{ ...intent, provider_charge_id: 'charge-smoke', status: 'ACTIVE', br_code: 'pix-code', qr_code: null }], rowCount: 1 };
      throw new Error('consulta inesperada');
    }};
    const cache = { async ping() { return 'PONG' }, async incr() { return 1 }, async expire() { return 1 } };
    const provider = { name: 'woovi', async createCharge(input) { return { provider: 'woovi', providerChargeId: 'charge-smoke', correlationId: input.correlationId, status: 'ACTIVE', amountCents: 1990, brCode: 'pix-code', raw: {} } } };
    const app = await buildApp({ database, cache, provider });
    const response = await app.inject({ method: 'POST', url: '/v1/charges', headers: { authorization: 'Bearer ${key}', 'idempotency-key': 'order-smoke' }, payload: { amountCents: 1990 } });
    console.log('STATUS=' + response.statusCode);
    console.log(response.payload);
    await app.close();
  `;
  const { stdout } = await execFileAsync(process.execPath, ['--input-type=module', '--eval', script], {
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PAYMENTS_ENABLED: 'true',
      AXION_API_KEYS: `${key}:merchant-a:charges:read,charges:write`,
    },
  });

  assert.match(stdout, /STATUS=201/);
  assert.match(stdout, /"amountCents":1990/);
  assert.match(stdout, /"brCode":"pix-code"/);
});
