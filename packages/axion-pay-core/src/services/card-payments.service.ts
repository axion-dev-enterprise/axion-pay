import Stripe from 'stripe';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { DashboardUser } from './dashboard.service.js';

type Database = Pick<Pool, 'query'>;

export class CardPaymentError extends Error {
  constructor(message: string, readonly statusCode = 502) { super(message); }
}

export async function createCardPaymentIntent(
  database: Database,
  secretKey: string | undefined,
  user: DashboardUser,
  amountCents: number,
  idempotencyKey: string,
) {
  if (!secretKey) throw new CardPaymentError('Pagamentos por cartão não estão configurados.', 503);
  const merchant = await database.query<{ id: string }>(
    `SELECT id FROM merchant_accounts
      WHERE owner_auth_user_id = $1 AND status = 'ACTIVE'
      ORDER BY created_at ASC LIMIT 1`,
    [user.id],
  );
  if (!merchant.rowCount) throw new CardPaymentError('Crie um merchant ativo antes de iniciar uma cobrança.', 422);

  const correlationId = randomUUID();
  const stripe = new Stripe(secretKey);
  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'brl',
    automatic_payment_methods: { enabled: true },
    receipt_email: user.email,
    metadata: {
      axion_auth_user_id: user.id,
      axion_merchant_id: merchant.rows[0].id,
      axion_correlation_id: correlationId,
    },
  }, { idempotencyKey: `axion_card_${merchant.rows[0].id}_${idempotencyKey}` });

  if (!intent.client_secret) throw new CardPaymentError('Stripe não retornou o segredo de confirmação.');
  await database.query(
    `INSERT INTO payment_intents
      (merchant_id, idempotency_key, provider, correlation_id, provider_charge_id, amount_cents, currency, status)
     VALUES ($1, $2, 'stripe', $3, $4, $5, 'BRL', $6)
     ON CONFLICT (merchant_id, idempotency_key) DO UPDATE SET updated_at = NOW()`,
    [merchant.rows[0].id, idempotencyKey, correlationId, intent.id, amountCents, intent.status.toUpperCase()],
  );
  return { paymentIntentId: intent.id, clientSecret: intent.client_secret, amountCents, currency: 'BRL', correlationId };
}
