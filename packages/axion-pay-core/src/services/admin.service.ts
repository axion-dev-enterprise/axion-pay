import type { Pool } from 'pg';

type Database = Pick<Pool, 'query'>;

export async function getAdminOverview(database: Database) {
  const result = await database.query<{
    merchants: string;
    active_keys: string;
    charges_today: string;
    volume_month_cents: string;
    pending_kyc: string;
    gateway_subscriptions: string;
    flow_subscriptions: string;
  }>(`SELECT
    (SELECT COUNT(*) FROM merchant_accounts WHERE status = 'ACTIVE') AS merchants,
    (SELECT COUNT(*) FROM merchant_api_keys WHERE status = 'ACTIVE') AS active_keys,
    (SELECT COUNT(*) FROM payment_intents WHERE created_at >= date_trunc('day', NOW())) AS charges_today,
    (SELECT COALESCE(SUM(amount_cents), 0) FROM financial_transactions
      WHERE direction = 'CREDIT' AND status IN ('PAID', 'COMPLETED', 'CONFIRMED')
        AND created_at >= date_trunc('month', NOW())) AS volume_month_cents,
    (SELECT COUNT(*) FROM gateway_onboarding_profiles WHERE status IN ('SUBMITTED', 'IN_REVIEW', 'ACTION_REQUIRED')) AS pending_kyc,
    (SELECT COUNT(*) FROM gateway_billing_customers WHERE subscription_status IN ('active', 'trialing')) AS gateway_subscriptions,
    (SELECT COUNT(*) FROM flow_billing_accounts WHERE subscription_status IN ('active', 'trialing')) AS flow_subscriptions`);
  const row = result.rows[0];
  return {
    merchants: Number(row?.merchants ?? 0),
    activeKeys: Number(row?.active_keys ?? 0),
    chargesToday: Number(row?.charges_today ?? 0),
    volumeMonthCents: Number(row?.volume_month_cents ?? 0),
    pendingKyc: Number(row?.pending_kyc ?? 0),
    gatewaySubscriptions: Number(row?.gateway_subscriptions ?? 0),
    flowSubscriptions: Number(row?.flow_subscriptions ?? 0),
  };
}

export async function listAdminTransactions(database: Database) {
  const result = await database.query(`SELECT
      pi.id, pi.correlation_id AS "correlationId", pi.amount_cents AS "amountCents",
      pi.currency, pi.status, pi.provider, pi.created_at AS "createdAt",
      COALESCE(m.name, 'Merchant removido') AS "merchantName"
    FROM payment_intents pi
    LEFT JOIN merchant_accounts m ON m.id::text = pi.merchant_id
    ORDER BY pi.created_at DESC
    LIMIT 200`);
  return result.rows;
}
