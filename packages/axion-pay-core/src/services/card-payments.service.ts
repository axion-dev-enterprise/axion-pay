import Stripe from 'stripe';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { DashboardUser } from './dashboard.service.js';

type Database = Pick<Pool, 'query'>;

export type CardPaymentPrincipal =
  | { type: 'merchant'; merchantId: string; keyFingerprint?: string }
  | { type: 'user'; user: DashboardUser };

export class CardPaymentError extends Error {
  constructor(message: string, readonly statusCode = 502) { super(message); }
}

export type CreateCardPaymentIntentOptions = {
  receiptEmail?: string;
  metadata?: Record<string, string>;
};

export async function createCardPaymentIntent(
  database: Database,
  secretKey: string | undefined,
  principal: CardPaymentPrincipal,
  amountCents: number,
  idempotencyKey: string,
  options?: CreateCardPaymentIntentOptions,
) {
  if (!secretKey) throw new CardPaymentError('Pagamentos por cartão não estão configurados.', 503);
  const stripe = new Stripe(secretKey);

  let targetMerchantId: string;
  let ownerAuthUserId: string | null = null;
  let defaultReceiptEmail: string | undefined = undefined;

  if (principal.type === 'merchant') {
    const merchant = await database.query<{ id: string; owner_auth_user_id: string | null; billing_email: string | null }>(
      `SELECT id, owner_auth_user_id, billing_email FROM merchant_accounts
        WHERE id = $1 AND status = 'ACTIVE'`,
      [principal.merchantId],
    );
    if (!merchant.rowCount) throw new CardPaymentError('Merchant inativo ou não encontrado.', 422);
    targetMerchantId = merchant.rows[0].id;
    ownerAuthUserId = merchant.rows[0].owner_auth_user_id;
    defaultReceiptEmail = merchant.rows[0].billing_email || undefined;
  } else {
    const merchant = await database.query<{ id: string; billing_email: string | null }>(
      `SELECT id, billing_email FROM merchant_accounts
        WHERE owner_auth_user_id = $1 AND status = 'ACTIVE'
        ORDER BY created_at ASC LIMIT 1`,
      [principal.user.id],
    );
    if (!merchant.rowCount) throw new CardPaymentError('Crie um merchant ativo antes de iniciar uma cobrança.', 422);
    targetMerchantId = merchant.rows[0].id;
    ownerAuthUserId = principal.user.id;
    defaultReceiptEmail = options?.receiptEmail || principal.user.email || merchant.rows[0].billing_email || undefined;
  }

  const existing = await database.query<{
    id: string;
    correlation_id: string;
    provider_charge_id: string | null;
    amount_cents: string | number;
  }>(
    `SELECT id, correlation_id, provider_charge_id, amount_cents FROM payment_intents
      WHERE merchant_id = $1 AND idempotency_key = $2`,
    [targetMerchantId, idempotencyKey],
  );
  if (existing.rowCount && existing.rows[0]?.provider_charge_id) {
    if (Number(existing.rows[0].amount_cents) !== amountCents) {
      throw new CardPaymentError('Idempotency-Key já usada com outro valor.', 409);
    }
    const intent = await stripe.paymentIntents.retrieve(existing.rows[0].provider_charge_id);
    if (!intent.client_secret) throw new CardPaymentError('Stripe não retornou o segredo de confirmação.');
    return {
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      amountCents,
      currency: 'BRL',
      correlationId: existing.rows[0].correlation_id,
    };
  }

  const correlationId = randomUUID();
  const receiptEmail = options?.receiptEmail || defaultReceiptEmail;

  const metadata: Record<string, string> = {
    axion_merchant_id: targetMerchantId,
    axion_correlation_id: correlationId,
    ...(ownerAuthUserId ? { axion_auth_user_id: ownerAuthUserId } : {}),
    ...(options?.metadata ?? {}),
  };

  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'brl',
    automatic_payment_methods: { enabled: true },
    ...(receiptEmail ? { receipt_email: receiptEmail } : {}),
    metadata,
  }, { idempotencyKey: `axion_card_${targetMerchantId}_${idempotencyKey}` });

  if (!intent.client_secret) throw new CardPaymentError('Stripe não retornou o segredo de confirmação.');
  await database.query(
    `INSERT INTO payment_intents
      (merchant_id, idempotency_key, provider, correlation_id, provider_charge_id, amount_cents, currency, status)
     VALUES ($1, $2, 'stripe', $3, $4, $5, 'BRL', $6)
     ON CONFLICT (merchant_id, idempotency_key) DO UPDATE SET updated_at = NOW()`,
    [targetMerchantId, idempotencyKey, correlationId, intent.id, amountCents, intent.status.toUpperCase()],
  );
  return { paymentIntentId: intent.id, clientSecret: intent.client_secret, amountCents, currency: 'BRL', correlationId };
}
