import crypto from 'node:crypto';
import type { Pool } from 'pg';

type Database = Pick<Pool, 'query'>;

export type DashboardUser = {
  id: string;
  email: string;
  name?: string;
  picture?: string;
};

export async function syncDashboardUser(database: Database, user: DashboardUser): Promise<void> {
  await database.query(
    `INSERT INTO dashboard_users (auth_user_id, email, display_name, picture_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (auth_user_id) DO UPDATE SET
       email = EXCLUDED.email,
       display_name = EXCLUDED.display_name,
       picture_url = EXCLUDED.picture_url,
       updated_at = NOW()`,
    [user.id, user.email, user.name ?? null, user.picture ?? null],
  );
}

export async function getDashboardOverview(database: Database, userId: string) {
  const result = await database.query<{
    merchants: string;
    active_keys: string;
    transactions_today: string;
    volume_month_cents: string;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM merchant_accounts WHERE owner_auth_user_id = $1 AND status = 'ACTIVE') AS merchants,
       (SELECT COUNT(*)
          FROM merchant_api_keys k
          JOIN merchant_accounts m ON m.id = k.merchant_id
         WHERE m.owner_auth_user_id = $1 AND m.status = 'ACTIVE' AND k.status = 'ACTIVE') AS active_keys,
       (SELECT COUNT(*)
          FROM payment_intents pi
          JOIN merchant_accounts m ON m.id::text = pi.merchant_id
         WHERE m.owner_auth_user_id = $1
           AND pi.created_at >= date_trunc('day', NOW())) AS transactions_today,
       (SELECT COALESCE(SUM(pi.amount_cents), 0)
          FROM payment_intents pi
          JOIN merchant_accounts m ON m.id::text = pi.merchant_id
         WHERE m.owner_auth_user_id = $1
           AND pi.created_at >= date_trunc('month', NOW())
           AND pi.status = 'PAID') AS volume_month_cents`,
    [userId],
  );
  const row = result.rows[0] ?? { merchants: '0', active_keys: '0', transactions_today: '0', volume_month_cents: '0' };
  return {
    merchants: Number(row.merchants),
    activeKeys: Number(row.active_keys),
    transactionsToday: Number(row.transactions_today),
    volumeMonthCents: Number(row.volume_month_cents),
  };
}

export async function listMerchants(database: Database, userId: string) {
  const result = await database.query(
    `SELECT id, name, document, billing_email AS "billingEmail", status, created_at AS "createdAt"
       FROM merchant_accounts
      WHERE owner_auth_user_id = $1
      ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function createMerchant(
  database: Database,
  userId: string,
  input: { name: string; document?: string; billingEmail?: string },
) {
  const result = await database.query(
    `INSERT INTO merchant_accounts (owner_auth_user_id, name, document, billing_email)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, document, billing_email AS "billingEmail", status, created_at AS "createdAt"`,
    [userId, input.name, input.document ?? null, input.billingEmail ?? null],
  );
  return result.rows[0];
}

export async function setMerchantStatus(database: Database, userId: string, merchantId: string, status: 'ACTIVE' | 'INACTIVE') {
  const result = await database.query(
    `UPDATE merchant_accounts
        SET status = $3, updated_at = NOW()
      WHERE id = $1 AND owner_auth_user_id = $2
      RETURNING id, status`,
    [merchantId, userId, status],
  );
  return result.rows[0] ?? null;
}

export async function listMerchantApiKeys(database: Database, userId: string) {
  const result = await database.query(
    `SELECT k.id, k.merchant_id AS "merchantId", m.name AS "merchantName", k.name,
            k.key_prefix AS "keyPrefix", k.scopes, k.status,
            k.created_at AS "createdAt", k.last_used_at AS "lastUsedAt"
       FROM merchant_api_keys k
       JOIN merchant_accounts m ON m.id = k.merchant_id
      WHERE m.owner_auth_user_id = $1
      ORDER BY k.created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function createMerchantApiKey(
  database: Database,
  userId: string,
  input: { merchantId: string; name: string },
) {
  const ownedMerchant = await database.query<{ id: string }>(
    `SELECT id FROM merchant_accounts WHERE id = $1 AND owner_auth_user_id = $2 AND status = 'ACTIVE' LIMIT 1`,
    [input.merchantId, userId],
  );
  if (!ownedMerchant.rowCount) return null;

  const secret = `axp_live_${crypto.randomBytes(32).toString('base64url')}`;
  const secretHash = crypto.createHash('sha256').update(secret).digest('hex');
  const keyPrefix = secret.slice(0, 16);
  const result = await database.query(
    `INSERT INTO merchant_api_keys (merchant_id, created_by_auth_user_id, name, key_prefix, secret_hash)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, merchant_id AS "merchantId", name, key_prefix AS "keyPrefix", scopes, status, created_at AS "createdAt"`,
    [input.merchantId, userId, input.name, keyPrefix, secretHash],
  );
  return { ...result.rows[0], secret };
}

export async function revokeMerchantApiKey(database: Database, userId: string, keyId: string) {
  const result = await database.query(
    `UPDATE merchant_api_keys k
        SET status = 'REVOKED', revoked_at = NOW()
       FROM merchant_accounts m
      WHERE k.id = $1 AND k.merchant_id = m.id AND m.owner_auth_user_id = $2
        AND k.status = 'ACTIVE'
      RETURNING k.id, k.status`,
    [keyId, userId],
  );
  return result.rows[0] ?? null;
}

export async function listDashboardTransactions(database: Database, userId: string) {
  const result = await database.query(
    `SELECT pi.id, pi.correlation_id AS "correlationId", pi.amount_cents AS "amountCents",
            pi.status, pi.provider, pi.created_at AS "createdAt", m.name AS "merchantName"
       FROM payment_intents pi
       JOIN merchant_accounts m ON m.id::text = pi.merchant_id
      WHERE m.owner_auth_user_id = $1
      ORDER BY pi.created_at DESC
      LIMIT 100`,
    [userId],
  );
  return result.rows;
}

export async function getDashboardSettings(database: Database, userId: string) {
  const result = await database.query(
    `SELECT organization_name AS "organizationName", updated_at AS "updatedAt"
       FROM dashboard_user_settings WHERE auth_user_id = $1`,
    [userId],
  );
  return result.rows[0] ?? { organizationName: null, updatedAt: null };
}

export async function saveDashboardSettings(database: Database, userId: string, organizationName: string) {
  const result = await database.query(
    `INSERT INTO dashboard_user_settings (auth_user_id, organization_name)
     VALUES ($1, $2)
     ON CONFLICT (auth_user_id) DO UPDATE SET organization_name = EXCLUDED.organization_name, updated_at = NOW()
     RETURNING organization_name AS "organizationName", updated_at AS "updatedAt"`,
    [userId, organizationName],
  );
  return result.rows[0];
}
