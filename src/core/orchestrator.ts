import crypto from 'node:crypto';
import type { Pool } from 'pg';
import type { PaymentProvider, StoredPaymentIntent } from './types.js';
import { db } from '../db.js';

export class PaymentOrchestrator {
  constructor(
    private readonly provider: PaymentProvider,
    private readonly database: Pick<Pool, 'query'> = db,
  ) {}

  async createCharge(input: {
    merchantId: string;
    idempotencyKey: string;
    amountCents: number;
    comment?: string;
  }) {
    let intent = await this.findByIdempotency(input.merchantId, input.idempotencyKey);

    if (!intent) {
      const correlationId = crypto.randomUUID();
      const inserted = await this.database.query<StoredPaymentIntent>(
        `
          INSERT INTO payment_intents (
            merchant_id, idempotency_key, provider, correlation_id, amount_cents, status
          )
          VALUES ($1,$2,$3,$4,$5,'CREATING')
          ON CONFLICT (merchant_id, idempotency_key) DO NOTHING
          RETURNING *
        `,
        [input.merchantId, input.idempotencyKey, this.provider.name, correlationId, input.amountCents],
      );

      intent = inserted.rows[0] ?? await this.findByIdempotency(input.merchantId, input.idempotencyKey);
    }

    if (!intent) throw new Error('Não foi possível criar a intenção de pagamento.');
    if (intent.amount_cents !== input.amountCents) {
      throw Object.assign(new Error('Idempotency-Key já usada com outro valor.'), { statusCode: 409 });
    }
    if (intent.provider_charge_id) return intent;

    // A correlação é persistida antes da chamada externa. Em caso de timeout, a
    // próxima tentativa usa o mesmo identificador e não cria uma nova cobrança.
    const charge = await this.provider.createCharge({
      correlationId: intent.correlation_id,
      amountCents: input.amountCents,
      comment: input.comment,
    });

    const result = await this.database.query<StoredPaymentIntent>(
      `
        UPDATE payment_intents
        SET provider_charge_id = $1,
            status = $2,
            qr_code = $3,
            br_code = $4,
            raw_provider_response = $5,
            updated_at = NOW()
        WHERE id = $6
        RETURNING *
      `,
      [
        charge.providerChargeId || null,
        charge.status,
        charge.qrCodeUrl ?? null,
        charge.brCode ?? null,
        JSON.stringify(charge.raw),
        intent.id,
      ],
    );

    return result.rows[0];
  }

  async findByIdempotency(merchantId: string, idempotencyKey: string): Promise<StoredPaymentIntent | null> {
    const result = await this.database.query<StoredPaymentIntent>(
      `
        SELECT *
        FROM payment_intents
        WHERE merchant_id = $1
          AND idempotency_key = $2
        LIMIT 1
      `,
      [merchantId, idempotencyKey],
    );

    return result.rows[0] ?? null;
  }
}
