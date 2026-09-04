ALTER TABLE flow_billing_accounts
  ADD COLUMN IF NOT EXISTS plan_code TEXT,
  ADD COLUMN IF NOT EXISTS trial_days SMALLINT;

ALTER TABLE flow_billing_accounts
  ADD CONSTRAINT flow_billing_accounts_plan_code_check
  CHECK (plan_code IS NULL OR plan_code IN ('starter', 'professional', 'enterprise'));

ALTER TABLE flow_billing_accounts
  ADD CONSTRAINT flow_billing_accounts_trial_days_check
  CHECK (trial_days IS NULL OR trial_days IN (7, 14, 30));
