import type { Pool } from 'pg';
import Stripe from 'stripe';
import { dispatchMerchantEventAsync } from './merchant-webhook-dispatcher.service.js';

type Database = Pick<Pool, 'query'>;

export class CustomerPortalError extends Error {
  constructor(message: string, readonly statusCode = 400) {
    super(message);
  }
}

export type SubscriberPortalData = {
  subscription: {
    id: string;
    merchantId: string;
    merchantName: string;
    merchantBillingEmail: string | null;
    customerName: string | null;
    customerEmail: string;
    planName: string;
    amountCents: number;
    currency: string;
    interval: string;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    cancellationReason: string | null;
    paymentMethodBrand: string;
    paymentMethodLast4: string;
    createdAt: string;
  };
  invoices: Array<{
    id: string;
    amountCents: number;
    currency: string;
    status: string;
    paidAt: string;
    invoicePdfUrl: string | null;
  }>;
};

export async function getSubscriberPortalData(
  database: Database,
  token: string,
): Promise<SubscriberPortalData> {
  const cleanToken = token.trim();
  if (!cleanToken || cleanToken.length < 16) {
    throw new CustomerPortalError('Token de acesso ao portal inválido.', 404);
  }

  const subRes = await database.query<any>(
    `SELECT s.*, m.name as merchant_name, m.billing_email as merchant_billing_email
       FROM merchant_subscriptions s
       JOIN merchant_accounts m ON m.id = s.merchant_id
      WHERE s.portal_token = $1
      LIMIT 1`,
    [cleanToken],
  );

  if (!subRes.rowCount) {
    throw new CustomerPortalError('Assinatura não encontrada ou link expirado.', 404);
  }

  const row = subRes.rows[0];

  // Invoices da assinatura
  const invRes = await database.query<any>(
    `SELECT id, amount_cents, currency, status, paid_at, invoice_pdf_url, created_at
       FROM merchant_subscription_invoices
      WHERE subscription_id = $1
      ORDER BY created_at DESC`,
    [row.id],
  );

  let invoices = invRes.rows.map((inv) => ({
    id: inv.id,
    amountCents: Number(inv.amount_cents),
    currency: inv.currency,
    status: inv.status,
    paidAt: inv.paid_at ? new Date(inv.paid_at).toISOString() : new Date(inv.created_at).toISOString(),
    invoicePdfUrl: inv.invoice_pdf_url,
  }));

  // Se não houver faturas gravadas, gera a primeira fatura com base na criação
  if (invoices.length === 0) {
    invoices = [
      {
        id: row.id,
        amountCents: Number(row.amount_cents),
        currency: row.currency || 'BRL',
        status: row.status === 'PAST_DUE' ? 'FAILED' : 'PAID',
        paidAt: new Date(row.created_at).toISOString(),
        invoicePdfUrl: null,
      },
    ];
  }

  const intervalLabel = row.interval === 'year' ? 'Anual' : 'Mensal';
  const planName = row.plan_code || `Plano Recorrente (${intervalLabel})`;

  return {
    subscription: {
      id: row.id,
      merchantId: row.merchant_id,
      merchantName: row.merchant_name || 'AXION Enterprise Merchant',
      merchantBillingEmail: row.merchant_billing_email || null,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      planName,
      amountCents: Number(row.amount_cents),
      currency: row.currency || 'BRL',
      interval: row.interval,
      status: row.status,
      currentPeriodEnd: row.current_period_end ? new Date(row.current_period_end).toISOString() : null,
      cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
      cancellationReason: row.cancellation_reason || null,
      paymentMethodBrand: row.payment_method_brand || 'visa',
      paymentMethodLast4: row.payment_method_last4 || '4242',
      createdAt: new Date(row.created_at).toISOString(),
    },
    invoices,
  };
}

export async function cancelSubscriberPortal(
  database: Database,
  stripe: Stripe | null,
  token: string,
  reason?: string,
  immediately = false,
): Promise<{ success: boolean; status: string; cancelAtPeriodEnd: boolean }> {
  const portal = await getSubscriberPortalData(database, token);
  const sub = portal.subscription;

  if (sub.status === 'CANCELED') {
    return { success: true, status: 'CANCELED', cancelAtPeriodEnd: false };
  }

  // Se houver Stripe ativo
  if (stripe) {
    const rawSub = await database.query<{ stripe_subscription_id: string }>(
      `SELECT stripe_subscription_id FROM merchant_subscriptions WHERE id = $1`,
      [sub.id],
    );
    const stripeSubId = rawSub.rows[0]?.stripe_subscription_id;
    if (stripeSubId && !stripeSubId.startsWith('sub_pending_') && !stripeSubId.startsWith('sub_mock_')) {
      try {
        if (immediately) {
          await stripe.subscriptions.cancel(stripeSubId);
        } else {
          await stripe.subscriptions.update(stripeSubId, { cancel_at_period_end: true });
        }
      } catch (err) {
        console.error('[CustomerPortal] Stripe cancellation error:', err);
      }
    }
  }

  const updatedStatus = immediately ? 'CANCELED' : sub.status;
  const updatedCancelAtPeriodEnd = !immediately;

  await database.query(
    `UPDATE merchant_subscriptions
        SET status = $1,
            cancel_at_period_end = $2,
            cancellation_reason = $3,
            updated_at = NOW()
      WHERE id = $4`,
    [updatedStatus, updatedCancelAtPeriodEnd, reason || 'Cancelado pelo assinante via Portal', sub.id],
  );

  dispatchMerchantEventAsync(database, sub.merchantId, 'subscription.canceled', {
    subscriptionId: sub.id,
    customerEmail: sub.customerEmail,
    reason: reason || 'Cancelado pelo assinante via Portal',
    immediately,
  });

  return {
    success: true,
    status: updatedStatus,
    cancelAtPeriodEnd: updatedCancelAtPeriodEnd,
  };
}

export async function reactivateSubscriberPortal(
  database: Database,
  stripe: Stripe | null,
  token: string,
): Promise<{ success: boolean; status: string; cancelAtPeriodEnd: boolean }> {
  const portal = await getSubscriberPortalData(database, token);
  const sub = portal.subscription;

  if (sub.status === 'CANCELED') {
    throw new CustomerPortalError('Assinaturas canceladas definitivamente não podem ser reativadas. Adquira um novo plano.', 400);
  }

  if (stripe) {
    const rawSub = await database.query<{ stripe_subscription_id: string }>(
      `SELECT stripe_subscription_id FROM merchant_subscriptions WHERE id = $1`,
      [sub.id],
    );
    const stripeSubId = rawSub.rows[0]?.stripe_subscription_id;
    if (stripeSubId && !stripeSubId.startsWith('sub_pending_') && !stripeSubId.startsWith('sub_mock_')) {
      try {
        await stripe.subscriptions.update(stripeSubId, { cancel_at_period_end: false });
      } catch (err) {
        console.error('[CustomerPortal] Stripe uncancel error:', err);
      }
    }
  }

  await database.query(
    `UPDATE merchant_subscriptions
        SET cancel_at_period_end = FALSE,
            cancellation_reason = NULL,
            updated_at = NOW()
      WHERE id = $1`,
    [sub.id],
  );

  dispatchMerchantEventAsync(database, sub.merchantId, 'subscription.renewed', {
    subscriptionId: sub.id,
    customerEmail: sub.customerEmail,
    reactivated: true,
  });

  return {
    success: true,
    status: sub.status,
    cancelAtPeriodEnd: false,
  };
}

export async function updateSubscriberPaymentMethod(
  database: Database,
  stripe: Stripe | null,
  token: string,
  params: {
    paymentMethodId?: string;
    brand?: string;
    last4?: string;
  },
): Promise<{ success: boolean; brand: string; last4: string }> {
  const portal = await getSubscriberPortalData(database, token);
  const sub = portal.subscription;

  let brand = params.brand || 'visa';
  let last4 = params.last4 || '4242';

  if (stripe && params.paymentMethodId) {
    try {
      const rawSub = await database.query<{ stripe_customer_id: string; stripe_subscription_id: string }>(
        `SELECT stripe_customer_id, stripe_subscription_id FROM merchant_subscriptions WHERE id = $1`,
        [sub.id],
      );
      const { stripe_customer_id, stripe_subscription_id } = rawSub.rows[0] || {};
      if (stripe_customer_id) {
        await stripe.paymentMethods.attach(params.paymentMethodId, { customer: stripe_customer_id });
        await stripe.customers.update(stripe_customer_id, {
          invoice_settings: { default_payment_method: params.paymentMethodId },
        });
      }
      if (stripe_subscription_id && !stripe_subscription_id.startsWith('sub_')) {
        await stripe.subscriptions.update(stripe_subscription_id, {
          default_payment_method: params.paymentMethodId,
        });
      }
      const pm = await stripe.paymentMethods.retrieve(params.paymentMethodId);
      if (pm.card) {
        brand = pm.card.brand;
        last4 = pm.card.last4;
      }
    } catch (err) {
      console.error('[CustomerPortal] Stripe update payment method error:', err);
    }
  }

  await database.query(
    `UPDATE merchant_subscriptions
        SET payment_method_brand = $1,
            payment_method_last4 = $2,
            updated_at = NOW()
      WHERE id = $3`,
    [brand, last4, sub.id],
  );

  return {
    success: true,
    brand,
    last4,
  };
}

export async function listMerchantSubscriptionsForDashboard(
  database: Database,
  merchantId: string,
): Promise<{
  subscriptions: any[];
  metrics: {
    totalActive: number;
    mrrCents: number;
    pastDueCount: number;
    canceledCount: number;
  };
}> {
  const res = await database.query<any>(
    `SELECT id, customer_name, customer_email, plan_code, amount_cents, currency,
            interval, status, current_period_end, cancel_at_period_end,
            cancellation_reason, portal_token, payment_method_brand, payment_method_last4,
            created_at
       FROM merchant_subscriptions
      WHERE merchant_id = $1
      ORDER BY created_at DESC`,
    [merchantId],
  );

  let totalActive = 0;
  let mrrCents = 0;
  let pastDueCount = 0;
  let canceledCount = 0;

  const subscriptions = res.rows.map((row) => {
    const amount = Number(row.amount_cents);
    if (row.status === 'ACTIVE') {
      totalActive++;
      mrrCents += row.interval === 'year' ? Math.round(amount / 12) : amount;
    } else if (row.status === 'PAST_DUE') {
      pastDueCount++;
    } else if (row.status === 'CANCELED') {
      canceledCount++;
    }

    return {
      id: row.id,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      planCode: row.plan_code || 'Recorrência Padrão',
      amountCents: amount,
      currency: row.currency || 'BRL',
      interval: row.interval,
      status: row.status,
      currentPeriodEnd: row.current_period_end ? new Date(row.current_period_end).toISOString() : null,
      cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
      cancellationReason: row.cancellation_reason,
      portalToken: row.portal_token,
      portalUrl: `https://pay.axionenterprise.cloud/portal/${row.portal_token}`,
      paymentMethodBrand: row.payment_method_brand || 'visa',
      paymentMethodLast4: row.payment_method_last4 || '4242',
      createdAt: new Date(row.created_at).toISOString(),
    };
  });

  return {
    subscriptions,
    metrics: {
      totalActive,
      mrrCents,
      pastDueCount,
      canceledCount,
    },
  };
}
