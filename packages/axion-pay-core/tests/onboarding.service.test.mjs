import assert from 'node:assert/strict';
import test from 'node:test';
import { saveOnboardingProfile, submitOnboardingProfile } from '../dist/src/services/onboarding.service.js';

test('KYC nunca persiste o número completo do documento', async () => {
  const calls = [];
  const database = {
    async query(sql, values) {
      calls.push({ sql, values });
      return {
        rowCount: 1,
        rows: [{
          legal_entity_type: 'BUSINESS',
          legal_name: 'AXION Enterprise LTDA',
          document_last_four: '0100',
          status: 'DRAFT',
          country_code: 'BR',
          kyc_provider: 'MANUAL_REVIEW',
        }],
      };
    },
  };

  const profile = await saveOnboardingProfile(database, 'auth-user-1', {
    legalEntityType: 'BUSINESS',
    legalName: 'AXION Enterprise LTDA',
    documentNumber: '12.345.678/0001-00',
    countryCode: 'BR',
  });

  assert.equal(profile.documentLastFour, '0100');
  assert.equal(calls[0].values.includes('12.345.678/0001-00'), false);
  assert.match(calls[0].values[4], /^[a-f0-9]{64}$/);
  assert.equal(calls[0].values[5], '0100');
  assert.match(calls[0].sql, /document_hash = COALESCE/);
});

test('envio do KYC só avança perfis completos e em estado editável', async () => {
  let sql = '';
  const database = {
    async query(statement) {
      sql = statement;
      return { rowCount: 0, rows: [] };
    },
  };

  const profile = await submitOnboardingProfile(database, 'auth-user-1');

  assert.equal(profile, null);
  assert.match(sql, /status IN \('DRAFT', 'ACTION_REQUIRED'\)/);
  assert.match(sql, /document_hash IS NOT NULL/);
  assert.match(sql, /terms_accepted_at IS NOT NULL/);
  assert.match(sql, /privacy_accepted_at IS NOT NULL/);
});
