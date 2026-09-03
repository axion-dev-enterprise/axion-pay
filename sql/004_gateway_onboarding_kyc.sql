CREATE TABLE IF NOT EXISTS gateway_onboarding_profiles (
  auth_user_id TEXT PRIMARY KEY REFERENCES dashboard_users(auth_user_id) ON DELETE CASCADE,
  legal_entity_type TEXT NOT NULL DEFAULT 'BUSINESS'
    CHECK (legal_entity_type IN ('INDIVIDUAL', 'BUSINESS')),
  legal_name TEXT,
  trading_name TEXT,
  document_hash TEXT,
  document_last_four TEXT,
  billing_email TEXT,
  phone_e164 TEXT,
  country_code TEXT NOT NULL DEFAULT 'BR' CHECK (country_code ~ '^[A-Z]{2}$'),
  website_url TEXT,
  business_description TEXT,
  terms_accepted_at TIMESTAMPTZ,
  privacy_accepted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'ACTION_REQUIRED', 'APPROVED', 'REJECTED')),
  kyc_provider TEXT NOT NULL DEFAULT 'MANUAL_REVIEW',
  provider_reference TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  review_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gateway_onboarding_document_shape CHECK (
    (document_hash IS NULL AND document_last_four IS NULL)
    OR (document_hash ~ '^[a-f0-9]{64}$' AND document_last_four ~ '^[0-9]{4}$')
  )
);

CREATE INDEX IF NOT EXISTS idx_gateway_onboarding_status
  ON gateway_onboarding_profiles(status, submitted_at ASC)
  WHERE status IN ('SUBMITTED', 'IN_REVIEW', 'ACTION_REQUIRED');

CREATE TABLE IF NOT EXISTS gateway_kyc_review_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_auth_user_id TEXT NOT NULL REFERENCES dashboard_users(auth_user_id) ON DELETE RESTRICT,
  reviewer_auth_user_id TEXT NOT NULL REFERENCES dashboard_users(auth_user_id) ON DELETE RESTRICT,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL CHECK (to_status IN ('IN_REVIEW', 'ACTION_REQUIRED', 'APPROVED', 'REJECTED')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gateway_kyc_review_events_subject
  ON gateway_kyc_review_events(subject_auth_user_id, created_at DESC);
