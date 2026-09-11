-- Migration 008: Payment Links Architecture
-- Links de pagamento autônomos para checkout público (PIX dinâmico e Cartão de Crédito)

CREATE TABLE IF NOT EXISTS payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchant_accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount_cents BIGINT,
  allow_custom_amount BOOLEAN NOT NULL DEFAULT FALSE,
  accepted_methods TEXT[] NOT NULL DEFAULT ARRAY['PIX', 'CARD']::TEXT[],
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'EXPIRED')),
  expires_at TIMESTAMPTZ,
  max_uses INT,
  times_used INT NOT NULL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_links_merchant
  ON payment_links(merchant_id, status);

CREATE INDEX IF NOT EXISTS idx_payment_links_lookup
  ON payment_links(id, status);
