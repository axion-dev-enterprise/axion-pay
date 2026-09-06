import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import type { Redis } from 'ioredis';
import type { Pool } from 'pg';
import rawBody from 'fastify-raw-body';
import cors from '@fastify/cors';
import { z } from 'zod';
import { config } from './config.js';
import { db } from './db.js';
import { redis } from './redis.js';
import { PaymentOrchestrator } from './core/orchestrator.js';
import { OpenFinanceProvider } from './providers/openfinance.provider.js';
import { NubankWebProvider } from './providers/nubank-web.provider.js';
import { WooviProvider } from './providers/woovi.provider.js';
import { authenticateApiKey, authenticateStoredApiKey, hasScopes, readPresentedApiKey, type AuthenticatedMerchant } from './services/auth.service.js';
import {
  createMerchant,
  createMerchantApiKey,
  getDashboardOverview,
  getDashboardSettings,
  listDashboardTransactions,
  listMerchantApiKeys,
  listMerchants,
  revokeMerchantApiKey,
  saveDashboardSettings,
  setMerchantStatus,
  syncDashboardUser,
  type DashboardUser,
} from './services/dashboard.service.js';
import { ReconciliationService } from './services/reconciliation.service.js';
import { WooviWebhookService } from './services/webhook.service.js';
import { FlowBillingService } from './services/flow-billing.service.js';
import { getOnboardingProfile, isOnboardingApproved, listKycApplications, reviewOnboardingProfile, saveOnboardingProfile, submitOnboardingProfile } from './services/onboarding.service.js';
import { createCustomerPortal, createSubscriptionCheckout, getBillingStatus, ingestStripeWebhook } from './services/stripe-billing.service.js';
import { getAdminOverview, listAdminTransactions } from './services/admin.service.js';
import { openapi } from './openapi.js';

const createChargeSchema = z.object({
  amountCents: z.number().int().positive().max(100_000_000),
  comment: z.string().trim().min(1).max(140).optional(),
});

const correlationIdParams = z.object({ correlationId: z.string().uuid() });
const merchantIdParams = z.object({ merchantId: z.string().uuid() });
const apiKeyIdParams = z.object({ keyId: z.string().uuid() });
const dashboardMerchantSchema = z.object({
  name: z.string().trim().min(1).max(120),
  document: z.string().trim().max(32).optional(),
  billingEmail: z.string().trim().email().max(254).optional(),
});
const merchantStatusSchema = z.object({ status: z.enum(['ACTIVE', 'INACTIVE']) });
const dashboardApiKeySchema = z.object({
  merchantId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
});
const dashboardSettingsSchema = z.object({ organizationName: z.string().trim().min(1).max(120) });
const flowCheckoutSchema = z.object({ plan: z.enum(['starter', 'professional', 'enterprise']).default('professional') });
const onboardingProfileSchema = z.object({
  legalEntityType: z.enum(['INDIVIDUAL', 'BUSINESS']).default('BUSINESS'),
  legalName: z.string().trim().min(2).max(160).optional(),
  tradingName: z.string().trim().min(2).max(160).optional(),
  documentNumber: z.string().trim().min(11).max(32).optional(),
  billingEmail: z.string().trim().email().max(254).optional(),
  phoneE164: z.string().trim().regex(/^\+[1-9]\d{7,14}$/).optional(),
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).default('BR'),
  websiteUrl: z.string().trim().url().max(2_048).optional(),
  businessDescription: z.string().trim().min(10).max(1_000).optional(),
  acceptTerms: z.boolean().optional(),
  acceptPrivacy: z.boolean().optional(),
});
const kycApplicationParams = z.object({ authUserId: z.string().trim().min(1).max(255) });
const kycApplicationQuery = z.object({
  status: z.enum(['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'ACTION_REQUIRED', 'APPROVED', 'REJECTED']).optional(),
});
const kycReviewSchema = z.object({
  status: z.enum(['IN_REVIEW', 'ACTION_REQUIRED', 'APPROVED', 'REJECTED']),
  reason: z.string().trim().min(3).max(1_000).optional(),
}).superRefine((value, context) => {
  if (['ACTION_REQUIRED', 'REJECTED'].includes(value.status) && !value.reason) {
    context.addIssue({ code: 'custom', path: ['reason'], message: 'Motivo é obrigatório para este resultado de revisão.' });
  }
});

type AppDependencies = {
  provider?: WooviProvider;
  database?: Pick<Pool, 'query' | 'connect'>;
  cache?: Pick<Redis, 'ping' | 'incr' | 'expire'>;
  flowBilling?: FlowBillingService;
};

function publicIntent(row: Record<string, unknown>) {
  return {
    id: row.id,
    correlationId: row.correlation_id,
    status: row.status,
    amountCents: Number(row.amount_cents),
    currency: row.currency,
    qrCodeUrl: row.qr_code,
    brCode: row.br_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function buildApp(dependencies: AppDependencies = {}) {
  const database = dependencies.database ?? db;
  const cache = dependencies.cache ?? redis;
  const woovi = dependencies.provider ?? new WooviProvider({
    apiBase: config.WOOVI_API_BASE,
    appId: config.WOOVI_APP_ID ?? '',
    publicKeysUrl: config.WOOVI_WEBHOOK_PUBLIC_KEYS_URL,
  });
  const orchestrator = new PaymentOrchestrator(woovi, database);
  const webhookService = new WooviWebhookService(woovi, database);
  const reconciliation = new ReconciliationService(database);
  const flowBilling = dependencies.flowBilling ?? new FlowBillingService(database);
  const stripeBillingConfig = {
    secretKey: config.STRIPE_SECRET_KEY,
    priceId: config.STRIPE_PRICE_ID,
    webhookSecret: config.STRIPE_WEBHOOK_SECRET,
    appBaseUrl: config.PAY_APP_BASE_URL,
  };
  const app = Fastify({
    logger: {
      redact: ['req.headers.authorization', 'req.headers.x-api-key'],
    },
    trustProxy: true,
  });

  await app.register(cors, {
    origin(origin, callback) {
      if (!origin || config.dashboardAllowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    allowedHeaders: ['authorization', 'content-type', 'idempotency-key', 'x-trace-id'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS'],
  });

  await app.register(rawBody, {
    field: 'rawBody',
    global: false,
    encoding: false,
    runFirst: true,
  });

  app.addHook('onRequest', async (request, reply) => {
    const presented = request.headers['x-trace-id'];
    const traceId = typeof presented === 'string' && /^[a-zA-Z0-9_-]{16,128}$/.test(presented)
      ? presented
      : randomUUID();
    reply.header('X-Trace-ID', traceId);
  });

  app.addHook('onResponse', async (request, reply) => {
    app.log.info({
      traceId: reply.getHeader('x-trace-id'),
      method: request.method,
      route: request.routeOptions.url,
      statusCode: reply.statusCode,
      latencyMs: Math.round(reply.elapsedTime),
    }, 'request_completed');
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Requisição inválida.',
          traceId: String(reply.getHeader('x-trace-id') ?? ''),
          timestamp: new Date().toISOString(),
          details: error.flatten(),
        },
      });
    }

    const statusCode = typeof (error as { statusCode?: unknown }).statusCode === 'number'
      ? (error as { statusCode: number }).statusCode
      : 500;
    if (statusCode >= 500) app.log.error(error);
    return reply.code(statusCode).send({
      error: {
        code: statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR',
        message: statusCode >= 500 ? 'Erro interno.' : error instanceof Error ? error.message : 'Erro na requisição.',
        traceId: String(reply.getHeader('x-trace-id') ?? ''),
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.get('/health', async (_request, reply) => {
    try {
      await Promise.all([database.query('SELECT 1'), cache.ping()]);
      return { ok: true, status: 'ok', service: 'axion-pay-core', timestamp: new Date().toISOString() };
    } catch {
      return reply.code(503).send({ ok: false, status: 'unavailable', service: 'axion-pay-core', timestamp: new Date().toISOString() });
    }
  });

  app.get('/openapi.json', async () => openapi);

  app.get('/v1/dashboard/me', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    return { user };
  });

  app.get('/v1/dashboard/overview', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    return getDashboardOverview(database, user.id);
  });

  app.get('/v1/dashboard/merchants', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    return { merchants: await listMerchants(database, user.id) };
  });

  app.post('/v1/dashboard/merchants', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    const input = dashboardMerchantSchema.parse(request.body);
    const merchant = await createMerchant(database, user.id, input);
    return reply.code(201).send({ merchant });
  });

  app.patch('/v1/dashboard/merchants/:merchantId', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    const { merchantId } = merchantIdParams.parse(request.params);
    const { status } = merchantStatusSchema.parse(request.body);
    const merchant = await setMerchantStatus(database, user.id, merchantId, status);
    if (!merchant) return reply.code(404).send({ error: 'Operação não encontrada.' });
    return { merchant };
  });

  app.get('/v1/dashboard/api-keys', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    return { keys: await listMerchantApiKeys(database, user.id) };
  });

  app.post('/v1/dashboard/api-keys', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    if (!await isOnboardingApproved(database, user.id)) {
      return reply.code(409).send({ error: 'KYC aprovado é obrigatório antes de gerar chaves de API.' });
    }
    const input = dashboardApiKeySchema.parse(request.body);
    const key = await createMerchantApiKey(database, user.id, input);
    if (!key) return reply.code(404).send({ error: 'Operação ativa não encontrada.' });
    return reply.code(201).send({ key });
  });

  app.post('/v1/dashboard/api-keys/:keyId/revoke', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    const { keyId } = apiKeyIdParams.parse(request.params);
    const key = await revokeMerchantApiKey(database, user.id, keyId);
    if (!key) return reply.code(404).send({ error: 'Chave ativa não encontrada.' });
    return { key };
  });

  app.get('/v1/dashboard/transactions', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    return { transactions: await listDashboardTransactions(database, user.id) };
  });

  app.get('/v1/dashboard/settings', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    return { settings: await getDashboardSettings(database, user.id) };
  });

  app.post('/v1/dashboard/settings', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    const { organizationName } = dashboardSettingsSchema.parse(request.body);
    return { settings: await saveDashboardSettings(database, user.id, organizationName) };
  });

  app.get('/v1/dashboard/onboarding', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    return {
      onboarding: await getOnboardingProfile(database, user.id),
      canReviewKyc: config.kycReviewerIds.has(user.id),
    };
  });

  app.put('/v1/dashboard/onboarding', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    const profile = await saveOnboardingProfile(database, user.id, onboardingProfileSchema.parse(request.body));
    if (!profile) return reply.code(409).send({ error: 'O cadastro está em revisão e não pode ser alterado.' });
    return { onboarding: profile };
  });

  app.post('/v1/dashboard/onboarding/submit', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    const profile = await submitOnboardingProfile(database, user.id);
    if (!profile) {
      return reply.code(422).send({
        error: 'Complete os dados legais, documento, contato, atividade e aceites antes de enviar o KYC.',
      });
    }
    return { onboarding: profile };
  });

  app.get('/v1/internal/kyc/applications', async (request, reply) => {
    const reviewer = await requireKycReviewer(request, reply, database);
    if (!reviewer) return;
    const { status } = kycApplicationQuery.parse(request.query);
    return { applications: await listKycApplications(database, status) };
  });

  app.post('/v1/internal/kyc/applications/:authUserId/review', async (request, reply) => {
    const reviewer = await requireKycReviewer(request, reply, database);
    if (!reviewer) return;
    const { authUserId } = kycApplicationParams.parse(request.params);
    const decision = kycReviewSchema.parse(request.body);
    const onboarding = await reviewOnboardingProfile(database, authUserId, reviewer.id, decision);
    if (!onboarding) return reply.code(409).send({ error: 'Solicitação ausente ou não está disponível para revisão.' });
    return { onboarding };
  });

  app.get('/v1/internal/admin/overview', async (request, reply) => {
    const reviewer = await requireKycReviewer(request, reply, database);
    if (!reviewer) return;
    return { overview: await getAdminOverview(database), user: reviewer };
  });

  app.get('/v1/internal/admin/transactions', async (request, reply) => {
    const reviewer = await requireKycReviewer(request, reply, database);
    if (!reviewer) return;
    return { transactions: await listAdminTransactions(database) };
  });

  app.get('/v1/dashboard/integrations', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    return {
      provider: config.PAYMENT_PROVIDER,
      paymentsEnabled: config.PAYMENTS_ENABLED,
      chargesEndpoint: '/v1/charges',
      webhookEndpoint: '/webhooks/woovi',
      billing: {
        provider: 'stripe',
        enabled: config.STRIPE_BILLING_ENABLED,
        checkoutEndpoint: '/v1/dashboard/billing/checkout',
        portalEndpoint: '/v1/dashboard/billing/portal',
        webhookEndpoint: '/webhooks/stripe',
      },
    };
  });

  // AXION Flow usa esta superfície, sempre autenticada pelo AXION Auth. Não há
  // plano ativo ou teste "simulado": o estado vem exclusivamente do banco
  // atualizado por webhooks assinados do Stripe.
  app.get('/v1/flow/billing', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    return flowBilling.getStatus(user.id);
  });

  app.post('/v1/flow/billing/checkout', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    const { plan } = flowCheckoutSchema.parse(request.body ?? {});
    return reply.code(201).send(await flowBilling.createCheckout(user, plan));
  });

  app.post('/v1/flow/billing/portal', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    return flowBilling.createPortal(user.id);
  });

  app.get('/v1/dashboard/billing', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    return { billing: await getBillingStatus(database, user.id), configured: config.STRIPE_BILLING_ENABLED };
  });

  app.post('/v1/dashboard/billing/checkout', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    if (!config.STRIPE_BILLING_ENABLED) return reply.code(503).send({ error: 'Assinaturas por cartão ainda não estão configuradas.' });
    return reply.code(201).send(await createSubscriptionCheckout(database, stripeBillingConfig, user));
  });

  app.post('/v1/dashboard/billing/portal', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    if (!config.STRIPE_BILLING_ENABLED) return reply.code(503).send({ error: 'Assinaturas por cartão ainda não estão configuradas.' });
    return createCustomerPortal(database, stripeBillingConfig, user);
  });

  app.post('/webhooks/stripe', { config: { rawBody: true } }, async (request, reply) => {
    const signature = request.headers['stripe-signature'];
    if (!Buffer.isBuffer(request.rawBody)) return reply.code(400).send({ error: 'rawBody indisponível' });
    if (!signature) return reply.code(401).send({ error: 'stripe-signature ausente' });
    const resolvedSignature = Array.isArray(signature) ? signature[0] : signature;
    if (!config.STRIPE_ENABLED && !config.STRIPE_BILLING_ENABLED) {
      return reply.code(503).send({ error: 'Assinaturas por cartão ainda não estão configuradas.' });
    }
    const results = await Promise.all([
      config.STRIPE_ENABLED ? flowBilling.ingestWebhook(request.rawBody, resolvedSignature) : null,
      config.STRIPE_BILLING_ENABLED ? ingestStripeWebhook(database, stripeBillingConfig, request.rawBody, resolvedSignature) : null,
    ]);
    return reply.code(200).send({ received: true, products: results.filter(Boolean).length });
  });

  app.post('/webhooks/woovi', { config: { rawBody: true } }, async (request, reply) => {
    const signature = request.headers['x-webhook-signature'];
    if (!Buffer.isBuffer(request.rawBody)) return reply.code(400).send({ error: 'rawBody indisponível' });

    // Reject unsigned requests even while payments are disabled. This avoids
    // exposing a different response for a malformed webhook endpoint.
    if (!signature) return reply.code(401).send({ error: 'x-webhook-signature ausente' });
    if (!config.PAYMENTS_ENABLED) return reply.code(503).send({ error: 'Pagamentos ainda não configurados.' });

    const result = await webhookService.ingest(
      request.rawBody,
      Array.isArray(signature) ? signature[0] : signature,
    );
    return reply.code(200).send(result);
  });

  app.post('/v1/charges', async (request, reply) => {
    const merchant = await requireMerchant(request, reply, ['charges:write'], cache, database);
    if (!merchant) return;
    if (!config.PAYMENTS_ENABLED) return reply.code(503).send({ error: 'Pagamentos ainda não configurados.' });

    const idempotencyKey = String(request.headers['idempotency-key'] ?? '').trim();
    if (!idempotencyKey || idempotencyKey.length > 255) {
      return reply.code(400).send({ error: 'Header Idempotency-Key é obrigatório e deve ter até 255 caracteres.' });
    }

    const body = createChargeSchema.parse(request.body);
    const result = await orchestrator.createCharge({
      merchantId: merchant.merchantId,
      idempotencyKey,
      ...body,
    });
    return reply.code(201).send(publicIntent(result));
  });

  app.get('/v1/charges/:correlationId', async (request, reply) => {
    const merchant = await requireMerchant(request, reply, ['charges:read'], cache, database);
    if (!merchant) return;

    const { correlationId } = correlationIdParams.parse(request.params);
    const result = await database.query(
      `SELECT * FROM payment_intents
       WHERE merchant_id = $1 AND correlation_id = $2
       LIMIT 1`,
      [merchant.merchantId, correlationId],
    );
    if (!result.rowCount) return reply.code(404).send({ error: 'Cobrança não encontrada.' });
    return publicIntent(result.rows[0]);
  });

  if (config.ENABLE_BANK_RECONCILIATION) {
    app.post('/internal/reconcile/nubank', async (request, reply) => {
      const merchant = await requireMerchant(request, reply, ['reconciliation:write'], cache, database);
      if (!merchant) return;
      if (!config.NUBANK_WEB_ENABLED) return reply.code(409).send({ error: 'NUBANK_WEB_ENABLED=false' });

      const nubank = new NubankWebProvider({
        url: config.NUBANK_WEB_URL,
        profileDir: config.NUBANK_PROFILE_DIR,
        headless: config.NUBANK_HEADLESS,
      });
      const snapshot = await nubank.snapshot();
      const stored = await reconciliation.persistSnapshot(snapshot, merchant.merchantId);
      return { storedId: stored.id, capturedAt: snapshot.capturedAt };
    });

    app.get('/internal/open-finance/accounts', async (request, reply) => {
      const merchant = await requireMerchant(request, reply, ['reconciliation:read'], cache, database);
      if (!merchant) return;
      if (!config.OPEN_FINANCE_ENABLED) return reply.code(409).send({ error: 'OPEN_FINANCE_ENABLED=false' });

      const required = [config.OPEN_FINANCE_API_BASE, config.OPEN_FINANCE_TOKEN_URL, config.OPEN_FINANCE_CLIENT_ID];
      if (required.some((value) => !value)) return reply.code(503).send({ error: 'Configuração Open Finance incompleta.' });

      const provider = new OpenFinanceProvider({
        apiBase: config.OPEN_FINANCE_API_BASE!,
        tokenUrl: config.OPEN_FINANCE_TOKEN_URL!,
        clientId: config.OPEN_FINANCE_CLIENT_ID!,
        clientSecret: config.OPEN_FINANCE_CLIENT_SECRET,
        certPath: config.OPEN_FINANCE_MTLS_CERT_PATH,
        keyPath: config.OPEN_FINANCE_MTLS_KEY_PATH,
        caPath: config.OPEN_FINANCE_MTLS_CA_PATH,
        accountsPath: config.OPEN_FINANCE_ACCOUNTS_PATH,
        transactionsPathTemplate: config.OPEN_FINANCE_TRANSACTIONS_PATH_TEMPLATE,
      });
      return provider.listAccounts();
    });
  }

  return app;
}

async function requireMerchant(
  request: FastifyRequest,
  reply: FastifyReply,
  scopes: string[],
  cache: Pick<Redis, 'incr' | 'expire'>,
  database: Pick<Pool, 'query'>,
): Promise<AuthenticatedMerchant | null> {
  const presentedKey = readPresentedApiKey(request.headers);
  const principal = authenticateApiKey(presentedKey, config.apiKeys)
    ?? await authenticateStoredApiKey(presentedKey, database);
  if (!principal) {
    reply.code(401).send({ error: 'API key ausente ou inválida.' });
    return null;
  }
  if (!hasScopes(principal, scopes)) {
    reply.code(403).send({ error: 'Escopo insuficiente.' });
    return null;
  }

  const window = Math.floor(Date.now() / 60_000);
  const rateKey = `rate-limit:${principal.keyFingerprint}:${window}`;
  try {
    const current = await cache.incr(rateKey);
    if (current === 1) await cache.expire(rateKey, 70);
    if (current > config.RATE_LIMIT_PER_MINUTE) {
      reply.code(429).send({ error: 'Limite de requisições excedido.' });
      return null;
    }
  } catch {
    reply.code(503).send({ error: 'Serviço temporariamente indisponível.' });
    return null;
  }

  return principal;
}

async function requireDashboardUser(
  request: FastifyRequest,
  reply: FastifyReply,
  database: Pick<Pool, 'query'>,
): Promise<DashboardUser | null> {
  const token = readPresentedApiKey(request.headers);
  const cookie = typeof request.headers.cookie === 'string' ? request.headers.cookie : undefined;
  if (!token && !cookie) {
    reply.code(401).send({ error: 'Autenticação AXION obrigatória.' });
    return null;
  }

  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (cookie) headers.Cookie = cookie;
    const response = await fetch(`${config.AUTH_API_BASE}/api/auth/me`, {
      headers,
      signal: AbortSignal.timeout(5_000),
    });
    const payload = await response.json().catch(() => null) as {
      authenticated?: boolean;
      user?: { id?: unknown; email?: unknown; name?: unknown; picture?: unknown };
    } | null;
    const remoteUser = payload?.user;
    if (!response.ok || !payload?.authenticated || !remoteUser || typeof remoteUser.id !== 'string' || typeof remoteUser.email !== 'string') {
      reply.code(401).send({ error: 'Sessão AXION inválida ou expirada.' });
      return null;
    }

    const user: DashboardUser = {
      id: remoteUser.id,
      email: remoteUser.email,
      name: typeof remoteUser.name === 'string' ? remoteUser.name : undefined,
      picture: typeof remoteUser.picture === 'string' ? remoteUser.picture : undefined,
    };
    await syncDashboardUser(database, user);
    return user;
  } catch {
    reply.code(503).send({ error: 'Não foi possível validar a sessão AXION.' });
    return null;
  }
}

async function requireKycReviewer(
  request: FastifyRequest,
  reply: FastifyReply,
  database: Pick<Pool, 'query'>,
): Promise<DashboardUser | null> {
  const user = await requireDashboardUser(request, reply, database);
  if (!user) return null;
  if (!config.kycReviewerIds.has(user.id)) {
    reply.code(403).send({ error: 'Permissão de revisão KYC obrigatória.' });
    return null;
  }
  return user;
}
