-- Migration 009: Merchant WhatsApp Notifications Settings and Logs
CREATE TABLE IF NOT EXISTS merchant_whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchant_accounts(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  notify_on_pix_created BOOLEAN NOT NULL DEFAULT true,
  notify_on_payment_approved BOOLEAN NOT NULL DEFAULT true,
  notify_on_pix_expiring BOOLEAN NOT NULL DEFAULT false,
  notify_on_subscription_failed BOOLEAN NOT NULL DEFAULT true,
  template_pix_created TEXT,
  template_payment_approved TEXT,
  template_pix_expiring TEXT,
  template_subscription_failed TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_merchant_whatsapp_settings UNIQUE (merchant_id)
);

CREATE INDEX IF NOT EXISTS idx_merchant_whatsapp_settings_merchant_id
  ON merchant_whatsapp_settings (merchant_id);

CREATE TABLE IF NOT EXISTS merchant_whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchant_accounts(id) ON DELETE CASCADE,
  charge_id TEXT,
  recipient_phone TEXT NOT NULL,
  event_type TEXT NOT NULL,
  message_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchant_whatsapp_logs_merchant_id
  ON merchant_whatsapp_logs (merchant_id, created_at DESC);
