import crypto from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { db } from '../db.js';
import type { PaymentStatus } from '../core/types.js';
import { WooviProvider } from '../providers/woovi.provider.js';

type WebhookDetails = {
  correlationId?: string;
  externalEventId?: string;
  eventType?: string;
  providerTransactionId?: string;
  endToEndId?: string;
  amountCents?: number;
  status?: PaymentStatus;
};

export class WooviWebhookService {
  constructor(
    private readonly provider: WooviProvider,
    private readonly database: Pick<Pool, 'connect'> = db,
  ) {}

  async ingest(rawBody: Buffer, signature: string | undefined) {
    if (!signature) {
      throw Object.assign(new Error('x-webhook-signature ausente'), { statusCode: 401 });
    }

    const signatureValid = await this.provider.verifyWebhook(rawBody, signature);
    if (!signatureValid) {
      throw Object.assign(new Error('Assinatura de webhook inválida'), { statusCode: 401 });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw Object.assign(new Error('Webhook contém JSON inválido.'), { statusCode: 400 });
    }

    const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');
    const details = extractWebhookDetails(payload);
    const client = await this.database.connect();

    try {
      await client.query('BEGIN');
      const inserted = await client.query<{ id: string }>(
        `
          INSERT INTO webhook_events (
            provider, external_event_id, event_type, payload_hash, signature_valid, raw_body
          ) VALUES ($1,$2,$3,$4,true,$5)
          ON CONFLICT (provider, payload_hash) DO NOTHING
          RETURNING id
        `,
        [
          'woovi',
          details.externalEventId ?? null,
          details.eventType ?? null,
          payloadHash,
          rawBody.toString('utf8'),
        ],
      );

      if (!inserted.rowCount) {
        await client.query('COMMIT');
        return { accepted: true, duplicate: true, payloadHash, processed: false };
      }

      const eventId = inserted.rows[0].id;
      const processingError = await this.applyPaymentUpdate(client, details, eventId, payload);

      await client.query(
        `UPDATE webhook_events
         SET processed_at = NOW(), processing_error = $1
         WHERE id = $2`,
        [processingError, eventId],
      );
      await client.query('COMMIT');

      return {
        accepted: true,
        duplicate: false,
        payloadHash,
        processed: !processingError,
        ...(processingError ? { processingError } : {}),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async applyPaymentUpdate(
    client: PoolClient,
    details: WebhookDetails,
    eventId: string,
    payload: unknown,
  ): Promise<string | null> {
    if (!details.correlationId) return 'correlation_id ausente no evento';
    if (!details.status) return 'status de pagamento ausente ou desconhecido';
    if (details.status === 'PAID' && !details.providerTransactionId && !details.endToEndId) {
      return 'identificador transacional ausente em evento pago';
    }

    const updated = await client.query<{ id: string; amount_cents: number }>(
      `
        UPDATE payment_intents
        SET status = $1, updated_at = NOW()
        WHERE correlation_id = $2
          -- A refund is terminal. A delayed "paid" event must never put a
          -- refunded charge back into a collectible state. Paid intents may
          -- only remain paid or advance to refunded.
          AND NOT (status = 'REFUNDED' AND $1 <> 'REFUNDED')
          AND NOT (status = 'PAID' AND $1 NOT IN ('PAID', 'REFUNDED'))
          -- A signed event is still rejected if it does not describe the
          -- amount originally requested for this correlation id.
          AND ($3::bigint IS NULL OR amount_cents = $3::bigint)
        RETURNING id, amount_cents
      `,
      [details.status, details.correlationId, details.amountCents ?? null],
    );

    if (!updated.rowCount) return 'payment_intent não encontrado, valor divergente ou transição inválida';

    if (details.status === 'PAID') {
      const amount = details.amountCents ?? updated.rows[0].amount_cents;
      await client.query(
        `
          INSERT INTO financial_transactions (
            payment_intent_id, provider, provider_transaction_id, end_to_end_id,
            amount_cents, direction, status, occurred_at, raw_data
          ) VALUES ($1,'woovi',$2,$3,$4,'CREDIT','PAID',NOW(),$5)
          ON CONFLICT DO NOTHING
        `,
        [
          updated.rows[0].id,
          details.providerTransactionId ?? eventId,
          details.endToEndId ?? null,
          amount,
          JSON.stringify(payload),
        ],
      );
    }

    return null;
  }
}

export function extractWebhookDetails(payload: unknown): WebhookDetails {
  const root = payload as Record<string, any>;
  const charge = root?.charge ?? root?.data?.charge ?? root?.data ?? root;
  const transaction = charge?.transaction ?? charge?.transactions?.[0] ?? root?.transaction ?? root?.pix;
  const rawStatus = charge?.status ?? root?.status ?? root?.event?.status ?? root?.eventType ?? root?.type ?? (typeof root?.event === 'string' ? root.event : undefined);

  return {
    correlationId: firstText(charge?.correlationID, charge?.correlationId, root?.correlationID, root?.correlationId),
    externalEventId: firstText(root?.event?.id, root?.eventId, root?.id),
    eventType: firstText(root?.event?.type, root?.eventType, root?.type, typeof root?.event === 'string' ? root.event : undefined),
    providerTransactionId: firstText(transaction?.id, transaction?.transactionID, transaction?.transactionId),
    endToEndId: firstText(transaction?.endToEndId, transaction?.endToEndID, transaction?.end_to_end_id),
    amountCents: toCents(transaction?.value ?? charge?.value ?? root?.value),
    status: normalizePaymentStatus(rawStatus),
  };
}

export function normalizePaymentStatus(status: unknown): PaymentStatus | undefined {
  const value = String(status ?? '').toUpperCase();
  if (/(COMPLETED|CONFIRMED|PAID)/.test(value)) return 'PAID';
  if (/REFUND/.test(value)) return 'REFUNDED';
  if (/EXPIRED/.test(value)) return 'EXPIRED';
  if (/(FAILED|ERROR|CANCEL)/.test(value)) return 'FAILED';
  if (/(ACTIVE|CREATED|PENDING|OPEN)/.test(value)) return 'ACTIVE';
  return undefined;
}

function firstText(...values: unknown[]): string | undefined {
  const value = values.find((candidate) => typeof candidate === 'string' || typeof candidate === 'number');
  return value === undefined || value === null ? undefined : String(value);
}

function toCents(value: unknown): number | undefined {
  const amount = Number(value);
  return Number.isInteger(amount) && amount > 0 ? amount : undefined;
}
