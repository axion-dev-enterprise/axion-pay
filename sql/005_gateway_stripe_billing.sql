CREATE TABLE IF NOT EXISTS gateway_billing_customers (
  auth_user_id TEXT PRIMARY KEY REFERENCES dashboard_users(auth_user_id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  subscription_status TEXT,
  price_id TEXT,
  checkout_session_id TEXT UNIQUE,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gateway_billing_customers_status
  ON gateway_billing_customers(subscription_status, current_period_end);

CREATE TABLE IF NOT EXISTS gateway_stripe_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  event_created_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gateway_stripe_webhook_events_customer
  ON gateway_stripe_webhook_events(stripe_customer_id, received_at DESC);
