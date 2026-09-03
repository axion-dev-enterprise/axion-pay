ALTER TABLE payment_intents
  ADD COLUMN IF NOT EXISTS correlation_id TEXT;

ALTER TABLE payment_intents
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_intents_correlation_id
  ON payment_intents(correlation_id)
  WHERE correlation_id IS NOT NULL;

ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS processing_error TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_intents_merchant_created
  ON payment_intents(merchant_id, created_at DESC);
