import crypto from 'node:crypto';
import type { Pool } from 'pg';

type Database = Pick<Pool, 'query'> & Partial<Pick<Pool, 'connect'>>;

export type OnboardingStatus = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'ACTION_REQUIRED' | 'APPROVED' | 'REJECTED';
export type LegalEntityType = 'INDIVIDUAL' | 'BUSINESS';

export type OnboardingProfileInput = {
  legalEntityType: LegalEntityType;
  legalName?: string;
  tradingName?: string;
  documentNumber?: string;
  billingEmail?: string;
  phoneE164?: string;
  countryCode: string;
  websiteUrl?: string;
  businessDescription?: string;
  acceptTerms?: boolean;
  acceptPrivacy?: boolean;
};

function normalizeDocument(value: string): string {
  return value.replace(/\D/g, '');
}

function toPublicProfile(row: Record<string, unknown>) {
  return {
    legalEntityType: row.legal_entity_type,
    legalName: row.legal_name,
    tradingName: row.trading_name,
    documentLastFour: row.document_last_four,
    billingEmail: row.billing_email,
    phoneE164: row.phone_e164,
    countryCode: row.country_code,
    websiteUrl: row.website_url,
    businessDescription: row.business_description,
    termsAcceptedAt: row.terms_accepted_at,
    privacyAcceptedAt: row.privacy_accepted_at,
    status: row.status,
    kycProvider: row.kyc_provider,
    providerReference: row.provider_reference,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    reviewReason: row.review_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getOnboardingProfile(database: Database, userId: string) {
  const result = await database.query(
    `SELECT * FROM gateway_onboarding_profiles WHERE auth_user_id = $1 LIMIT 1`,
    [userId],
  );
  return result.rowCount ? toPublicProfile(result.rows[0]) : null;
}

export async function saveOnboardingProfile(database: Database, userId: string, input: OnboardingProfileInput) {
  const normalizedDocument = input.documentNumber ? normalizeDocument(input.documentNumber) : null;
  const documentHash = normalizedDocument
    ? crypto.createHash('sha256').update(normalizedDocument).digest('hex')
    : null;
  const documentLastFour = normalizedDocument ? normalizedDocument.slice(-4) : null;

  const result = await database.query(
    `INSERT INTO gateway_onboarding_profiles (
       auth_user_id, legal_entity_type, legal_name, trading_name, document_hash,
       document_last_four, billing_email, phone_e164, country_code, website_url,
       business_description, terms_accepted_at, privacy_accepted_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
       CASE WHEN $12 THEN NOW() ELSE NULL END,
       CASE WHEN $13 THEN NOW() ELSE NULL END
     )
     ON CONFLICT (auth_user_id) DO UPDATE SET
       legal_entity_type = EXCLUDED.legal_entity_type,
       legal_name = EXCLUDED.legal_name,
       trading_name = EXCLUDED.trading_name,
       document_hash = COALESCE(EXCLUDED.document_hash, gateway_onboarding_profiles.document_hash),
       document_last_four = COALESCE(EXCLUDED.document_last_four, gateway_onboarding_profiles.document_last_four),
       billing_email = EXCLUDED.billing_email,
       phone_e164 = EXCLUDED.phone_e164,
       country_code = EXCLUDED.country_code,
       website_url = EXCLUDED.website_url,
       business_description = EXCLUDED.business_description,
       terms_accepted_at = CASE WHEN $12 THEN COALESCE(gateway_onboarding_profiles.terms_accepted_at, NOW()) ELSE gateway_onboarding_profiles.terms_accepted_at END,
       privacy_accepted_at = CASE WHEN $13 THEN COALESCE(gateway_onboarding_profiles.privacy_accepted_at, NOW()) ELSE gateway_onboarding_profiles.privacy_accepted_at END,
       updated_at = NOW()
     WHERE gateway_onboarding_profiles.status IN ('DRAFT', 'ACTION_REQUIRED')
     RETURNING *`,
    [
      userId,
      input.legalEntityType,
      input.legalName ?? null,
      input.tradingName ?? null,
      documentHash,
      documentLastFour,
      input.billingEmail ?? null,
      input.phoneE164 ?? null,
      input.countryCode,
      input.websiteUrl ?? null,
      input.businessDescription ?? null,
      input.acceptTerms === true,
      input.acceptPrivacy === true,
    ],
  );
  return result.rowCount ? toPublicProfile(result.rows[0]) : null;
}

export async function submitOnboardingProfile(database: Database, userId: string) {
  const result = await database.query(
    `UPDATE gateway_onboarding_profiles
        SET status = 'SUBMITTED', submitted_at = NOW(), review_reason = NULL, updated_at = NOW()
      WHERE auth_user_id = $1
        AND status IN ('DRAFT', 'ACTION_REQUIRED')
        AND legal_name IS NOT NULL
        AND document_hash IS NOT NULL
        AND billing_email IS NOT NULL
        AND phone_e164 IS NOT NULL
        AND business_description IS NOT NULL
        AND terms_accepted_at IS NOT NULL
        AND privacy_accepted_at IS NOT NULL
      RETURNING *`,
    [userId],
  );
  return result.rowCount ? toPublicProfile(result.rows[0]) : null;
}

export async function isOnboardingApproved(database: Database, userId: string): Promise<boolean> {
  const result = await database.query(
    `SELECT 1 FROM gateway_onboarding_profiles WHERE auth_user_id = $1 AND status = 'APPROVED' LIMIT 1`,
    [userId],
  );
  return Boolean(result.rowCount);
}

export async function listKycApplications(database: Database, status?: OnboardingStatus) {
  const result = await database.query(
    `SELECT p.*, u.email AS user_email, u.display_name AS user_display_name
       FROM gateway_onboarding_profiles p
       JOIN dashboard_users u ON u.auth_user_id = p.auth_user_id
      WHERE ($1::text IS NULL OR p.status = $1)
      ORDER BY p.submitted_at NULLS LAST, p.updated_at DESC
      LIMIT 200`,
    [status ?? null],
  );
  return result.rows.map((row) => ({
    authUserId: row.auth_user_id,
    userEmail: row.user_email,
    userDisplayName: row.user_display_name,
    ...toPublicProfile(row),
  }));
}

export async function reviewOnboardingProfile(
  database: Database,
  subjectUserId: string,
  reviewerUserId: string,
  input: { status: Exclude<OnboardingStatus, 'DRAFT' | 'SUBMITTED'>; reason?: string },
) {
  const client = database.connect ? await database.connect() : null;
  const executor = client ?? database;
  try {
    if (client) await client.query('BEGIN');
    const current = await executor.query(
      `SELECT * FROM gateway_onboarding_profiles WHERE auth_user_id = $1 FOR UPDATE`,
      [subjectUserId],
    );
    if (!current.rowCount || !['SUBMITTED', 'IN_REVIEW', 'ACTION_REQUIRED'].includes(String(current.rows[0].status))) {
      if (client) await client.query('ROLLBACK');
      return null;
    }
    const updated = await executor.query(
      `UPDATE gateway_onboarding_profiles
          SET status = $2,
              reviewed_at = CASE WHEN $2 IN ('APPROVED', 'REJECTED', 'ACTION_REQUIRED') THEN NOW() ELSE reviewed_at END,
              review_reason = $3,
              updated_at = NOW()
        WHERE auth_user_id = $1
        RETURNING *`,
      [subjectUserId, input.status, input.reason ?? null],
    );
    await executor.query(
      `INSERT INTO gateway_kyc_review_events (
         subject_auth_user_id, reviewer_auth_user_id, from_status, to_status, reason
       ) VALUES ($1, $2, $3, $4, $5)`,
      [subjectUserId, reviewerUserId, current.rows[0].status, input.status, input.reason ?? null],
    );
    if (client) await client.query('COMMIT');
    return toPublicProfile(updated.rows[0]);
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client?.release();
  }
}
