-- Migration 007: Merchant Webhooks and Subscriptions Architecture
-- Suporte a webhooks outbound com assinatura HMAC-SHA256 e assinaturas recorrentes S2S

CREATE TABLE IF NOT EXISTS merchant_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchant_accounts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY[
    'payment.succeeded',
    'payment.failed',
    'subscription.created',
    'subscription.renewed',
    'subscription.past_due',
    'subscription.canceled'
  ]::TEXT[],
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_webhooks_lookup
  ON merchant_webhooks(merchant_id, status);

CREATE TABLE IF NOT EXISTS merchant_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchant_accounts(id) ON DELETE CASCADE,
  webhook_id UUID NOT NULL REFERENCES merchant_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status_code INT,
  response_body TEXT,
  attempts INT NOT NULL DEFAULT 1,
  delivered_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_webhook_deliveries_merchant
  ON merchant_webhook_deliveries(merchant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_merchant_webhook_deliveries_webhook
  ON merchant_webhook_deliveries(webhook_id, created_at DESC);

CREATE TABLE IF NOT EXISTS merchant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchant_accounts(id) ON DELETE RESTRICT,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  plan_code TEXT,
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  interval TEXT NOT NULL DEFAULT 'month',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_subscriptions_merchant
  ON merchant_subscriptions(merchant_id, status);

CREATE INDEX IF NOT EXISTS idx_merchant_subscriptions_stripe_sub
  ON merchant_subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_merchant_subscriptions_customer_email
  ON merchant_subscriptions(merchant_id, customer_email);
