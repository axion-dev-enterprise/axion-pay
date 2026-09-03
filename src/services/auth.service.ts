import crypto from 'node:crypto';
import type { Pool } from 'pg';
import type { ApiKeyConfig } from '../config.js';

export type AuthenticatedMerchant = {
  merchantId: string;
  scopes: Set<string>;
  keyFingerprint: string;
};

function matches(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function authenticateApiKey(
  presentedSecret: string | undefined,
  keys: ApiKeyConfig[],
): AuthenticatedMerchant | null {
  if (!presentedSecret) return null;

  const key = keys.find((candidate) => matches(candidate.secret, presentedSecret));
  if (!key) return null;

  return {
    merchantId: key.merchantId,
    scopes: key.scopes,
    keyFingerprint: crypto.createHash('sha256').update(presentedSecret).digest('hex').slice(0, 12),
  };
}

export function readPresentedApiKey(headers: Record<string, unknown>): string | undefined {
  const authorization = headers.authorization;
  const apiKey = headers['x-api-key'];
  const value = Array.isArray(apiKey) ? apiKey[0] : apiKey;

  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof authorization !== 'string') return undefined;

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim();
}

export function hasScopes(principal: AuthenticatedMerchant, required: string[]): boolean {
  return required.every((scope) => principal.scopes.has(scope) || principal.scopes.has('*'));
}

export async function authenticateStoredApiKey(
  presentedSecret: string | undefined,
  database: Pick<Pool, 'query'>,
): Promise<AuthenticatedMerchant | null> {
  if (!presentedSecret) return null;

  const secretHash = crypto.createHash('sha256').update(presentedSecret).digest('hex');
  const result = await database.query<{ merchant_id: string; scopes: string[] }>(
    `SELECT k.merchant_id, k.scopes
       FROM merchant_api_keys k
       JOIN merchant_accounts m ON m.id = k.merchant_id
      WHERE k.secret_hash = $1 AND k.status = 'ACTIVE' AND m.status = 'ACTIVE'
      LIMIT 1`,
    [secretHash],
  );
  const row = result.rows[0];
  if (!row) return null;

  await database.query(
    `UPDATE merchant_api_keys SET last_used_at = NOW() WHERE secret_hash = $1`,
    [secretHash],
  );
  return {
    merchantId: row.merchant_id,
    scopes: new Set(row.scopes),
    keyFingerprint: secretHash.slice(0, 12),
  };
}
