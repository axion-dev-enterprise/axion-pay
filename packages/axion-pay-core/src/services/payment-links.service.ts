import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { PaymentOrchestrator } from '../core/orchestrator.js';
import { createCardPaymentIntent } from './card-payments.service.js';
import { dispatchWhatsappNotification } from './merchant-whatsapp.service.js';

type Database = Pick<Pool, 'query'>;

export type CreatePaymentLinkParams = {
  title: string;
  description?: string;
  amountCents?: number;
  allowCustomAmount?: boolean;
  acceptedMethods?: string[];
  expiresAt?: string;
  maxUses?: number;
  metadata?: Record<string, unknown>;
};

export type PaymentLink = {
  id: string;
  merchantId: string;
  title: string;
  description: string | null;
  amountCents: number | null;
  allowCustomAmount: boolean;
  acceptedMethods: string[];
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  expiresAt: string | null;
  maxUses: number | null;
  timesUsed: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicPaymentLink = {
  id: string;
  title: string;
  description: string | null;
  amountCents: number | null;
  allowCustomAmount: boolean;
  acceptedMethods: string[];
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  merchantName: string;
  merchantDocument: string | null;
  createdAt: string;
};

export class PaymentLinkError extends Error {
  constructor(message: string, readonly statusCode = 400) {
    super(message);
  }
}

export async function createPaymentLink(
  database: Database,
  merchantId: string,
  params: CreatePaymentLinkParams,
): Promise<PaymentLink> {
  const title = (params.title || '').trim();
  if (!title || title.length > 120) {
    throw new PaymentLinkError('Título é obrigatório e deve ter até 120 caracteres.', 400);
  }

  const allowCustomAmount = Boolean(params.allowCustomAmount);
  let amountCents: number | null = null;

  if (!allowCustomAmount) {
    if (!params.amountCents || params.amountCents < 100) {
      throw new PaymentLinkError('Para links com valor fixo, o amountCents deve ser no mínimo 100 (R$ 1,00).', 400);
    }
    amountCents = Math.round(params.amountCents);
  }

  const acceptedMethods = (params.acceptedMethods && params.acceptedMethods.length > 0)
    ? params.acceptedMethods.map((m) => m.toUpperCase())
    : ['PIX', 'CARD'];

  for (const method of acceptedMethods) {
    if (!['PIX', 'CARD'].includes(method)) {
      throw new PaymentLinkError(`Método de pagamento inválido: ${method}. Aceitos: PIX, CARD.`, 400);
    }
  }

  let expiresAt: string | null = null;
  if (params.expiresAt) {
    const d = new Date(params.expiresAt);
    if (isNaN(d.getTime()) || d.getTime() <= Date.now()) {
      throw new PaymentLinkError('Data de expiração deve ser uma data futura válida.', 400);
    }
    expiresAt = d.toISOString();
  }

  const maxUses = params.maxUses && params.maxUses > 0 ? Math.round(params.maxUses) : null;

  const result = await database.query<any>(
    `INSERT INTO payment_links (
      merchant_id, title, description, amount_cents, allow_custom_amount,
      accepted_methods, status, expires_at, max_uses, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7, $8, $9)
    RETURNING *`,
    [
      merchantId,
      title,
      params.description?.trim() || null,
      amountCents,
      allowCustomAmount,
      acceptedMethods,
      expiresAt,
      maxUses,
      params.metadata ? JSON.stringify(params.metadata) : null,
    ],
  );

  const row = result.rows[0];
  return mapPaymentLinkRow(row);
}

export async function listMerchantPaymentLinks(
  database: Database,
  merchantId: string,
): Promise<PaymentLink[]> {
  const result = await database.query<any>(
    `SELECT * FROM payment_links
     WHERE merchant_id = $1
     ORDER BY created_at DESC`,
    [merchantId],
  );
  return result.rows.map(mapPaymentLinkRow);
}

export async function deletePaymentLink(
  database: Database,
  merchantId: string,
  linkId: string,
): Promise<{ success: boolean; id: string }> {
  const result = await database.query(
    `DELETE FROM payment_links
     WHERE id = $1 AND merchant_id = $2`,
    [linkId, merchantId],
  );
  if (!result.rowCount) {
    throw new PaymentLinkError('Link de pagamento não encontrado ou sem permissão.', 404);
  }
  return { success: true, id: linkId };
}

export async function getPublicPaymentLink(
  database: Database,
  linkId: string,
): Promise<PublicPaymentLink> {
  const result = await database.query<any>(
    `SELECT l.*, m.name as merchant_name, m.document as merchant_document
     FROM payment_links l
     JOIN merchant_accounts m ON m.id = l.merchant_id
     WHERE l.id = $1`,
    [linkId],
  );

  if (!result.rowCount) {
    throw new PaymentLinkError('Link de pagamento não encontrado.', 404);
  }

  const row = result.rows[0];

  // Checar expiração temporal
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now() && row.status === 'ACTIVE') {
    await database.query(`UPDATE payment_links SET status = 'EXPIRED' WHERE id = $1`, [linkId]);
    row.status = 'EXPIRED';
  }

  // Checar limite de utilizações
  if (row.max_uses && row.times_used >= row.max_uses && row.status === 'ACTIVE') {
    await database.query(`UPDATE payment_links SET status = 'EXPIRED' WHERE id = $1`, [linkId]);
    row.status = 'EXPIRED';
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    amountCents: row.amount_cents ? Number(row.amount_cents) : null,
    allowCustomAmount: row.allow_custom_amount,
    acceptedMethods: row.accepted_methods,
    status: row.status,
    merchantName: row.merchant_name || 'AXION Pay Merchant',
    merchantDocument: row.merchant_document ? formatDoc(row.merchant_document) : null,
    createdAt: row.created_at,
  };
}

export type ProcessPaymentLinkPaymentParams = {
  paymentMethod: 'PIX' | 'CARD';
  amountCents?: number;
  customerName?: string;
  customerEmail?: string;
  customerDocument?: string;
  customerPhone?: string;
};

export async function processPaymentLinkPayment(
  database: Database,
  orchestrator: PaymentOrchestrator,
  stripeSecretKey: string | undefined,
  linkId: string,
  input: ProcessPaymentLinkPaymentParams,
) {
  const result = await database.query<any>(
    `SELECT * FROM payment_links WHERE id = $1`,
    [linkId],
  );
  if (!result.rowCount) {
    throw new PaymentLinkError('Link de pagamento não encontrado.', 404);
  }

  const link = result.rows[0];

  if (link.status !== 'ACTIVE') {
    throw new PaymentLinkError(`Este link de pagamento está ${link.status.toLowerCase()}.`, 400);
  }

  if (link.expires_at && new Date(link.expires_at).getTime() <= Date.now()) {
    await database.query(`UPDATE payment_links SET status = 'EXPIRED' WHERE id = $1`, [linkId]);
    throw new PaymentLinkError('Este link de pagamento expirou.', 400);
  }

  if (link.max_uses && link.times_used >= link.max_uses) {
    await database.query(`UPDATE payment_links SET status = 'EXPIRED' WHERE id = $1`, [linkId]);
    throw new PaymentLinkError('Este link de pagamento atingiu o limite máximo de utilizações.', 400);
  }

  const method = input.paymentMethod?.toUpperCase();
  if (!link.accepted_methods.includes(method)) {
    throw new PaymentLinkError(`O método ${method} não é aceito neste link. Métodos permitidos: ${link.accepted_methods.join(', ')}`, 400);
  }

  let finalAmountCents: number;
  if (link.allow_custom_amount) {
    if (!input.amountCents || input.amountCents < 100) {
      throw new PaymentLinkError('O valor deve ser de no mínimo R$ 1,00 (100 centavos).', 400);
    }
    finalAmountCents = Math.round(input.amountCents);
  } else {
    finalAmountCents = Number(link.amount_cents);
  }

  const idempotencyKey = `plink_${link.id}_${randomUUID()}`;

  if (method === 'PIX') {
    const charge = await orchestrator.createCharge({
      merchantId: link.merchant_id,
      idempotencyKey,
      amountCents: finalAmountCents,
      comment: `Pagamento: ${link.title.slice(0, 50)}`,
    });

    await database.query(
      `UPDATE payment_links SET times_used = times_used + 1, updated_at = NOW() WHERE id = $1`,
      [linkId],
    );

    // Persiste metadata para reconciliação e webhook pós-pagamento
    await database.query(
      `UPDATE payment_intents 
       SET metadata = jsonb_build_object(
         'customer_phone', $1::text,
         'customer_name', $2::text,
         'customer_email', $3::text,
         'product_title', $4::text,
         'payment_link_id', $5::text
       )
       WHERE correlation_id = $6`,
      [
        input.customerPhone || null,
        input.customerName || null,
        input.customerEmail || null,
        link.title,
        link.id,
        charge.correlation_id,
      ],
    );

    // Dispara notificação transacional via WhatsApp de forma assíncrona
    if (input.customerPhone) {
      dispatchWhatsappNotification(
        database,
        link.merchant_id,
        'pix_created',
        input.customerPhone,
        {
          customer_name: input.customerName || 'Cliente',
          amount: `R$ ${(finalAmountCents / 100).toFixed(2).replace('.', ',')}`,
          product_title: link.title,
          pix_code: charge.br_code || '',
          checkout_url: `https://pay.axionenterprise.cloud/p/${link.id}`,
        },
        charge.correlation_id,
      ).catch((err) => console.error('[WhatsAppNotifier] Falha ao disparar pix_created:', err));
    }

    return {
      method: 'PIX' as const,
      correlationId: charge.correlation_id,
      amountCents: finalAmountCents,
      status: charge.status,
      qrCode: charge.qr_code,
      qrCodeText: charge.br_code,
    };
  }

  if (method === 'CARD') {
    if (!stripeSecretKey) {
      throw new PaymentLinkError('Pagamento por cartão não está disponível no momento.', 503);
    }

    const cardIntent = await createCardPaymentIntent(
      database,
      stripeSecretKey,
      { type: 'merchant', merchantId: link.merchant_id },
      finalAmountCents,
      idempotencyKey,
      {
        receiptEmail: input.customerEmail,
        metadata: {
          payment_link_id: link.id,
          customer_name: input.customerName || '',
          customer_document: input.customerDocument || '',
        },
      },
    );

    await database.query(
      `UPDATE payment_links SET times_used = times_used + 1, updated_at = NOW() WHERE id = $1`,
      [linkId],
    );

    return {
      method: 'CARD' as const,
      correlationId: cardIntent.correlationId,
      amountCents: finalAmountCents,
      clientSecret: cardIntent.clientSecret,
      paymentIntentId: cardIntent.paymentIntentId,
    };
  }

  throw new PaymentLinkError(`Método de pagamento ${method} não suportado.`, 400);
}

function mapPaymentLinkRow(row: any): PaymentLink {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    title: row.title,
    description: row.description,
    amountCents: row.amount_cents ? Number(row.amount_cents) : null,
    allowCustomAmount: row.allow_custom_amount,
    acceptedMethods: row.accepted_methods || ['PIX', 'CARD'],
    status: row.status,
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    maxUses: row.max_uses,
    timesUsed: Number(row.times_used || 0),
    metadata: row.metadata,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

function formatDoc(doc: string): string {
  const digits = doc.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits.slice(0, 3) + '.***.***-' + digits.slice(-2);
  }
  return digits.slice(0, 2) + '.***.***/' + digits.slice(-6, -2) + '-' + digits.slice(-2);
}
