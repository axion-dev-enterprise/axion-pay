import crypto from 'node:crypto';
import type { Pool } from 'pg';

type Database = Pick<Pool, 'query'>;

export type WebhookEventName =
  | 'payment.succeeded'
  | 'payment.failed'
  | 'subscription.created'
  | 'subscription.renewed'
  | 'subscription.past_due'
  | 'subscription.canceled';

export const ALLOWED_WEBHOOK_EVENTS: WebhookEventName[] = [
  'payment.succeeded',
  'payment.failed',
  'subscription.created',
  'subscription.renewed',
  'subscription.past_due',
  'subscription.canceled',
];

export type MerchantWebhook = {
  id: string;
  merchantId: string;
  url: string;
  secret: string;
  events: string[];
  status: 'ACTIVE' | 'DISABLED';
  createdAt: string;
};

export class MerchantWebhookError extends Error {
  constructor(message: string, readonly statusCode = 400) {
    super(message);
  }
}

export function signWebhookPayload(rawPayload: string, secret: string, timestamp: number): string {
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawPayload}`)
    .digest('hex');
  return `t=${timestamp},v1=${hmac}`;
}

export async function createMerchantWebhook(
  database: Database,
  merchantId: string,
  url: string,
  events?: string[],
): Promise<MerchantWebhook> {
  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('URL deve utilizar protocolo http ou https.');
    }
  } catch {
    throw new MerchantWebhookError('URL de webhook inválida.', 400);
  }

  const selectedEvents = events && events.length > 0
    ? events.filter((e) => ALLOWED_WEBHOOK_EVENTS.includes(e as WebhookEventName))
    : ALLOWED_WEBHOOK_EVENTS;

  if (!selectedEvents.length) {
    throw new MerchantWebhookError('Ao menos um evento válido deve ser selecionado.', 400);
  }

  const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

  const result = await database.query<{
    id: string;
    merchant_id: string;
    url: string;
    secret: string;
    events: string[];
    status: string;
    created_at: Date;
  }>(
    `INSERT INTO merchant_webhooks (merchant_id, url, secret, events, status)
     VALUES ($1, $2, $3, $4, 'ACTIVE')
     RETURNING id, merchant_id, url, secret, events, status, created_at`,
    [merchantId, url, secret, selectedEvents],
  );

  const row = result.rows[0];
  return {
    id: row.id,
    merchantId: row.merchant_id,
    url: row.url,
    secret: row.secret,
    events: row.events,
    status: row.status as 'ACTIVE' | 'DISABLED',
    createdAt: row.created_at.toISOString(),
  };
}

export async function listMerchantWebhooks(
  database: Database,
  merchantId: string,
): Promise<MerchantWebhook[]> {
  const result = await database.query<{
    id: string;
    merchant_id: string;
    url: string;
    secret: string;
    events: string[];
    status: string;
    created_at: Date;
  }>(
    `SELECT id, merchant_id, url, secret, events, status, created_at
     FROM merchant_webhooks
     WHERE merchant_id = $1 AND status = 'ACTIVE'
     ORDER BY created_at DESC`,
    [merchantId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    merchantId: row.merchant_id,
    url: row.url,
    secret: row.secret,
    events: row.events,
    status: row.status as 'ACTIVE' | 'DISABLED',
    createdAt: row.created_at.toISOString(),
  }));
}

export async function deleteMerchantWebhook(
  database: Database,
  merchantId: string,
  webhookId: string,
): Promise<{ deleted: boolean }> {
  const result = await database.query(
    `DELETE FROM merchant_webhooks WHERE id = $1 AND merchant_id = $2`,
    [webhookId, merchantId],
  );
  if (!result.rowCount) {
    throw new MerchantWebhookError('Webhook não encontrado.', 404);
  }
  return { deleted: true };
}

export async function listMerchantWebhookDeliveries(
  database: Database,
  merchantId: string,
  limit = 50,
) {
  const result = await database.query<{
    id: string;
    webhook_id: string;
    event_type: string;
    payload: unknown;
    status_code: number | null;
    attempts: number;
    delivered_at: Date | null;
    error: string | null;
    created_at: Date;
  }>(
    `SELECT id, webhook_id, event_type, payload, status_code, attempts, delivered_at, error, created_at
     FROM merchant_webhook_deliveries
     WHERE merchant_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [merchantId, Math.min(Math.max(1, limit), 100)],
  );

  return result.rows.map((r) => ({
    id: r.id,
    webhookId: r.webhook_id,
    eventType: r.event_type,
    payload: r.payload,
    statusCode: r.status_code,
    attempts: r.attempts,
    deliveredAt: r.delivered_at ? r.delivered_at.toISOString() : null,
    error: r.error,
    createdAt: r.created_at.toISOString(),
  }));
}

export function dispatchMerchantEventAsync(
  database: Database,
  merchantId: string,
  eventType: WebhookEventName,
  eventData: Record<string, unknown>,
): void {
  // Executa em background de forma segura e não-bloqueante
  setImmediate(async () => {
    try {
      await dispatchMerchantEvent(database, merchantId, eventType, eventData);
    } catch (err) {
      console.error('[MerchantWebhookDispatcher] Erro não tratado ao despachar webhook:', err);
    }
  });
}

export async function dispatchMerchantEvent(
  database: Database,
  merchantId: string,
  eventType: WebhookEventName,
  eventData: Record<string, unknown>,
): Promise<void> {
  const webhooksResult = await database.query<{
    id: string;
    url: string;
    secret: string;
    events: string[];
  }>(
    `SELECT id, url, secret, events
     FROM merchant_webhooks
     WHERE merchant_id = $1 AND status = 'ACTIVE' AND $2 = ANY(events)`,
    [merchantId, eventType],
  );

  if (!webhooksResult.rowCount) return;

  const eventId = crypto.randomUUID();
  const timestamp = Math.floor(Date.now() / 1_000);
  const payload = {
    id: eventId,
    event: eventType,
    timestamp,
    data: eventData,
  };
  const rawBody = JSON.stringify(payload);

  for (const webhook of webhooksResult.rows) {
    const signature = signWebhookPayload(rawBody, webhook.secret, timestamp);
    let statusCode: number | null = null;
    let responseBody: string | null = null;
    let errorMessage: string | null = null;
    let deliveredAt: Date | null = null;

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AXION-Pay-Webhook/1.0',
          'X-Axion-Signature': signature,
          'X-Axion-Event-Id': eventId,
        },
        body: rawBody,
        signal: AbortSignal.timeout(8_000),
      });

      statusCode = response.status;
      responseBody = await response.text().catch(() => null);
      if (responseBody && responseBody.length > 1000) {
        responseBody = responseBody.slice(0, 1000) + '...[truncated]';
      }

      if (response.ok) {
        deliveredAt = new Date();
      } else {
        errorMessage = `HTTP ${statusCode}: ${responseBody || 'Sem resposta'}`;
      }
    } catch (fetchErr) {
      errorMessage = (fetchErr as Error).message || 'Falha de conexão com o servidor do merchant';
    }

    try {
      await database.query(
        `INSERT INTO merchant_webhook_deliveries
           (merchant_id, webhook_id, event_type, payload, status_code, response_body, attempts, delivered_at, error)
         VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $8)`,
        [
          merchantId,
          webhook.id,
          eventType,
          payload,
          statusCode,
          responseBody,
          deliveredAt,
          errorMessage,
        ],
      );
    } catch (dbErr) {
      console.error('[MerchantWebhookDispatcher] Falha ao registrar entrega:', dbErr);
    }
  }
}

export async function testMerchantWebhook(
  database: Database,
  merchantId: string,
  webhookId: string,
): Promise<{ success: boolean; statusCode: number | null; error: string | null; eventId: string }> {
  const result = await database.query<{
    id: string;
    url: string;
    secret: string;
    events: string[];
  }>(
    `SELECT id, url, secret, events
     FROM merchant_webhooks
     WHERE id = $1 AND merchant_id = $2 AND status = 'ACTIVE'`,
    [webhookId, merchantId],
  );
  if (!result.rowCount) {
    throw new MerchantWebhookError('Webhook não encontrado ou inativo.', 404);
  }
  const webhook = result.rows[0];
  const eventId = crypto.randomUUID();
  const timestamp = Math.floor(Date.now() / 1_000);
  const payload = {
    id: eventId,
    event: 'payment.succeeded',
    timestamp,
    data: {
      test: true,
      chargeId: `ch_test_${crypto.randomBytes(6).toString('hex')}`,
      amountCents: 9900,
      currency: 'BRL',
      status: 'PAID',
      paymentMethod: 'PIX',
      description: 'Webhook de teste disparado pelo painel AXION Pay',
      customer: {
        name: 'Cliente Teste AXION',
        email: 'sandbox@axionenterprise.cloud',
      },
    },
  };
  const rawBody = JSON.stringify(payload);
  const signature = signWebhookPayload(rawBody, webhook.secret, timestamp);
  let statusCode: number | null = null;
  let responseBody: string | null = null;
  let errorMessage: string | null = null;
  let deliveredAt: Date | null = null;

  try {
    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AXION-Pay-Webhook/1.0',
        'X-Axion-Signature': signature,
        'X-Axion-Event-Id': eventId,
      },
      body: rawBody,
      signal: AbortSignal.timeout(8_000),
    });
    statusCode = res.status;
    responseBody = await res.text().catch(() => null);
    if (responseBody && responseBody.length > 1000) {
      responseBody = `${responseBody.slice(0, 1000)}...[truncated]`;
    }
    if (res.ok) {
      deliveredAt = new Date();
    } else {
      errorMessage = `HTTP ${res.status}: ${responseBody || 'Sem resposta'}`;
    }
  } catch (err: any) {
    errorMessage = err.name === 'TimeoutError' ? 'Timeout após 8 segundos' : (err.message || 'Falha de conexão com o endpoint');
  }

  await database.query(
    `INSERT INTO merchant_webhook_deliveries
       (merchant_id, webhook_id, event_type, payload, status_code, response_body, attempts, delivered_at, error)
     VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $8)`,
    [
      merchantId,
      webhook.id,
      'payment.succeeded',
      payload,
      statusCode,
      responseBody,
      deliveredAt,
      errorMessage,
    ],
  );

  return {
    success: statusCode !== null && statusCode >= 200 && statusCode < 300,
    statusCode,
    error: errorMessage,
    eventId,
  };
}

