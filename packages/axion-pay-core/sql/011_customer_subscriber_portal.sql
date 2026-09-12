-- Migration 011: Customer Subscriber Portal (Self-Service Portal & Invoices)
ALTER TABLE merchant_subscriptions
  ADD COLUMN IF NOT EXISTS portal_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS payment_method_brand TEXT DEFAULT 'visa',
  ADD COLUMN IF NOT EXISTS payment_method_last4 TEXT DEFAULT '4242';

-- Backfill tokens para assinaturas existentes sem token
UPDATE merchant_subscriptions
   SET portal_token = encode(gen_random_bytes(24), 'hex')
 WHERE portal_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_merchant_subscriptions_portal_token
  ON merchant_subscriptions (portal_token);

CREATE TABLE IF NOT EXISTS merchant_subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES merchant_subscriptions(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'PAID' CHECK (status IN ('PAID', 'FAILED', 'PENDING')),
  paid_at TIMESTAMPTZ DEFAULT now(),
  invoice_pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchant_subscription_invoices_sub
  ON merchant_subscription_invoices (subscription_id, created_at DESC);
