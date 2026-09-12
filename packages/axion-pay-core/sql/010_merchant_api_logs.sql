-- Migration 010: Merchant API Request Logs (API Logs Explorer / Request Inspector)
CREATE TABLE IF NOT EXISTS merchant_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchant_accounts(id) ON DELETE CASCADE,
  api_key_id UUID,
  method VARCHAR(10) NOT NULL,
  path TEXT NOT NULL,
  status_code INT NOT NULL,
  latency_ms INT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  idempotency_key TEXT,
  request_headers JSONB DEFAULT '{}'::jsonb,
  request_body JSONB DEFAULT '{}'::jsonb,
  response_body JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchant_api_logs_merchant_created
  ON merchant_api_logs (merchant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_merchant_api_logs_merchant_status
  ON merchant_api_logs (merchant_id, status_code);

CREATE INDEX IF NOT EXISTS idx_merchant_api_logs_method
  ON merchant_api_logs (merchant_id, method);
