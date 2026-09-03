CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  provider TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  provider_charge_id TEXT,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'PENDING',
  qr_code TEXT,
  br_code TEXT,
  raw_provider_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (merchant_id, idempotency_key),
  UNIQUE (correlation_id),
  UNIQUE (provider, provider_charge_id)
);

CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id UUID REFERENCES payment_intents(id),
  provider TEXT NOT NULL,
  provider_transaction_id TEXT,
  end_to_end_id TEXT,
  amount_cents BIGINT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('CREDIT', 'DEBIT')),
  status TEXT NOT NULL,
  occurred_at TIMESTAMPTZ,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_transaction_id),
  UNIQUE (end_to_end_id)
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  external_event_id TEXT,
  event_type TEXT,
  payload_hash TEXT NOT NULL,
  signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
  raw_body TEXT NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, payload_hash)
);

CREATE TABLE IF NOT EXISTS reconciliation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  account_ref TEXT,
  balance_cents BIGINT,
  snapshot JSONB NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_status
  ON payment_intents(status);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_e2e
  ON financial_transactions(end_to_end_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_processed
  ON webhook_events(processed_at);
