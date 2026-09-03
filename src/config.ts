import { z } from 'zod';

const boolFromEnv = z
  .string()
  .optional()
  .transform((v) => String(v).toLowerCase() === 'true');

export type ApiKeyConfig = {
  secret: string;
  merchantId: string;
  scopes: Set<string>;
};

function parseApiKeys(value: string | undefined): ApiKeyConfig[] {
  if (!value) return [];

  return value.split(';').map((entry) => {
    const [secret, merchantId, ...scopeParts] = entry.split(':');
    const scopes = scopeParts.join(':');
    if (!secret || secret.length < 24 || !merchantId || !scopes) {
      throw new Error(
        'AXION_API_KEYS deve usar o formato segredo:merchantId:escopo1,escopo2;...',
      );
    }

    const parsedScopes = new Set(scopes.split(',').map((scope) => scope.trim()).filter(Boolean));
    if (!parsedScopes.size) {
      throw new Error('Cada API key deve possuir ao menos um escopo.');
    }

    return {
      secret,
      merchantId,
      scopes: parsedScopes,
    };
  });
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().default('postgres://axion:axion@localhost:5432/axion_pay'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  PAYMENT_PROVIDER: z.enum(['woovi']).default('woovi'),
  AXION_API_KEYS: z.string().optional(),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().max(10_000).default(120),
  AUTH_API_BASE: z.string().url().default('https://auth.axionenterprise.cloud'),
  DASHBOARD_ALLOWED_ORIGINS: z.string().default('https://pay.axionenterprise.cloud,https://flow.axionenterprise.cloud'),
  KYC_REVIEWER_AUTH_USER_IDS: z.string().optional(),

  WOOVI_API_BASE: z.string().url().default('https://api.woovi-sandbox.com'),
  PAYMENTS_ENABLED: boolFromEnv,
  WOOVI_APP_ID: z.string().optional(),
  WOOVI_WEBHOOK_PUBLIC_KEYS_URL: z.string().url().default(
    'https://api.woovi-sandbox.com/api/v1/webhook/public-keys',
  ),
  // Assinaturas Stripe. A cobrança transacional PIX continua isolada no
  // provider Woovi; Flow e Pay usam preços e estados independentes.
  STRIPE_ENABLED: boolFromEnv,
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().regex(/^whsec_[A-Za-z0-9]+$/).optional(),
  STRIPE_FLOW_PRICE_ID: z.string().optional(),
  STRIPE_FLOW_SUCCESS_URL: z.string().url().default('https://flow.axionenterprise.cloud/dashboard?billing=success'),
  STRIPE_FLOW_CANCEL_URL: z.string().url().default('https://flow.axionenterprise.cloud/dashboard?billing=cancelled'),
  STRIPE_BILLING_ENABLED: boolFromEnv,
  STRIPE_PRICE_ID: z.string().regex(/^price_[A-Za-z0-9]+$/).optional(),
  PAY_APP_BASE_URL: z.string().url().default('https://pay.axionenterprise.cloud'),

  OPEN_FINANCE_ENABLED: boolFromEnv,
  OPEN_FINANCE_API_BASE: z.string().optional(),
  OPEN_FINANCE_TOKEN_URL: z.string().optional(),
  OPEN_FINANCE_CLIENT_ID: z.string().optional(),
  OPEN_FINANCE_CLIENT_SECRET: z.string().optional(),
  OPEN_FINANCE_MTLS_CERT_PATH: z.string().default('./certs/client.pem'),
  OPEN_FINANCE_MTLS_KEY_PATH: z.string().default('./certs/client.key'),
  OPEN_FINANCE_MTLS_CA_PATH: z.string().optional(),
  OPEN_FINANCE_ACCOUNTS_PATH: z.string().optional(),
  OPEN_FINANCE_TRANSACTIONS_PATH_TEMPLATE: z.string().optional(),

  NUBANK_WEB_ENABLED: boolFromEnv,
  NUBANK_WEB_URL: z.string().url().default('https://app.nubank.com.br/beta/pj/home'),
  NUBANK_PROFILE_DIR: z.string().default('.nubank-profile'),
  NUBANK_HEADLESS: boolFromEnv,
  ENABLE_BANK_RECONCILIATION: boolFromEnv,
});

const env = envSchema.parse(process.env);
const apiKeys = parseApiKeys(env.AXION_API_KEYS);
const dashboardAllowedOrigins = env.DASHBOARD_ALLOWED_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const kycReviewerIds = new Set((env.KYC_REVIEWER_AUTH_USER_IDS ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean));

if (env.NODE_ENV === 'production' && apiKeys.length === 0) {
  throw new Error('AXION_API_KEYS é obrigatório em produção.');
}
if (env.NODE_ENV === 'production' && env.PAYMENTS_ENABLED && !env.WOOVI_APP_ID) {
  throw new Error('WOOVI_APP_ID é obrigatório em produção.');
}
if (env.STRIPE_ENABLED && (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_FLOW_PRICE_ID)) {
  throw new Error('STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET e STRIPE_FLOW_PRICE_ID são obrigatórios quando STRIPE_ENABLED=true.');
}
if (env.NODE_ENV === 'production' && env.STRIPE_BILLING_ENABLED) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID || !env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_SECRET_KEY, STRIPE_PRICE_ID e STRIPE_WEBHOOK_SECRET são obrigatórios para assinaturas Stripe em produção.');
  }
}

export const config = {
  ...env,
  apiKeys,
  dashboardAllowedOrigins,
  kycReviewerIds,
};
