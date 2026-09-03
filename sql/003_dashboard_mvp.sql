CREATE TABLE IF NOT EXISTS dashboard_users (
  auth_user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  picture_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS merchant_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_auth_user_id TEXT NOT NULL REFERENCES dashboard_users(auth_user_id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  document TEXT,
  billing_email TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_accounts_owner
  ON merchant_accounts(owner_auth_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS merchant_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchant_accounts(id) ON DELETE RESTRICT,
  created_by_auth_user_id TEXT NOT NULL REFERENCES dashboard_users(auth_user_id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  key_prefix TEXT NOT NULL,
  secret_hash TEXT NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['charges:read', 'charges:write']::TEXT[],
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_merchant_api_keys_lookup
  ON merchant_api_keys(secret_hash) WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_merchant_api_keys_merchant
  ON merchant_api_keys(merchant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS dashboard_user_settings (
  auth_user_id TEXT PRIMARY KEY REFERENCES dashboard_users(auth_user_id) ON DELETE CASCADE,
  organization_name TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
