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
import { CardPaymentError, CardPaymentPrincipal, createCardPaymentIntent } from './services/card-payments.service.js';
import Stripe from 'stripe';
import {
  createMerchantWebhook,
  listMerchantWebhooks,
  deleteMerchantWebhook,
  listMerchantWebhookDeliveries,
  testMerchantWebhook,
  MerchantWebhookError,
} from './services/merchant-webhook-dispatcher.service.js';
import {
  createMerchantSubscription,
  getMerchantSubscription,
  cancelMerchantSubscription,
  MerchantSubscriptionError,
} from './services/merchant-subscriptions.service.js';
import {
  createPaymentLink,
  listMerchantPaymentLinks,
  deletePaymentLink,
  getPublicPaymentLink,
  processPaymentLinkPayment,
  PaymentLinkError,
} from './services/payment-links.service.js';
import {
  getMerchantWhatsappSettings,
  saveMerchantWhatsappSettings,
  sendTestWhatsappNotification,
  listMerchantWhatsappLogs,
} from './services/merchant-whatsapp.service.js';
import {
  recordApiLog,
  listMerchantApiLogs,
  getMerchantApiLogById,
  clearMerchantApiLogs,
} from './services/api-logs.service.js';
import { openapi } from './openapi.js';

const createChargeSchema = z.object({
  amountCents: z.number().int().positive().max(100_000_000),
  comment: z.string().trim().min(1).max(140).optional(),
});
const cardPaymentIntentSchema = z.object({
  amountCents: z.number().int().min(100).max(100_000_000),
  receiptEmail: z.string().email().optional(),
  customerEmail: z.string().email().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

const correlationIdParams = z.object({ correlationId: z.string().uuid() });
const merchantIdParams = z.object({ merchantId: z.string().uuid() });
const apiKeyIdParams = z.object({ keyId: z.string().uuid() });
const subscriptionIdParams = z.object({ id: z.string().uuid() });
const webhookIdParams = z.object({ id: z.string().uuid() });
const dashboardMerchantWebhookParams = z.object({
  merchantId: z.string().uuid(),
  id: z.string().uuid(),
});
const paymentLinkIdParams = z.object({ id: z.string().uuid() });
const dashboardPaymentLinkParams = z.object({
  merchantId: z.string().uuid(),
  id: z.string().uuid(),
});

const createPaymentLinkSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  amountCents: z.number().int().min(100).max(100_000_000).optional(),
  allowCustomAmount: z.boolean().optional(),
  acceptedMethods: z.array(z.string()).optional(),
  expiresAt: z.string().optional(),
  maxUses: z.number().int().positive().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const payPaymentLinkSchema = z.object({
  paymentMethod: z.enum(['PIX', 'CARD']),
  amountCents: z.number().int().min(100).max(100_000_000).optional(),
  customerName: z.string().trim().max(120).optional(),
  customerEmail: z.string().trim().email().optional(),
  customerDocument: z.string().trim().max(32).optional(),
  customerPhone: z.string().trim().max(32).optional(),
});

const updateMerchantWhatsappSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  notifyOnPixCreated: z.boolean().optional(),
  notifyOnPaymentApproved: z.boolean().optional(),
  notifyOnPixExpiring: z.boolean().optional(),
  notifyOnSubscriptionFailed: z.boolean().optional(),
  templatePixCreated: z.string().optional(),
  templatePaymentApproved: z.string().optional(),
  templatePixExpiring: z.string().optional(),
  templateSubscriptionFailed: z.string().optional(),
});

const sendTestWhatsappNotificationSchema = z.object({
  phone: z.string().trim().min(8).max(32),
  eventType: z.enum(['pix_created', 'payment_approved', 'pix_expiring', 'subscription_failed']),
});

const createMerchantWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).optional(),
});

const createMerchantSubscriptionSchema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().trim().max(120).optional(),
  amountCents: z.number().int().min(100).max(100_000_000),
  interval: z.enum(['month', 'year']).optional(),
  currency: z.string().length(3).optional(),
  paymentMethodId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
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
  // A draft must be saveable while a user is still completing the form. The
  // stricter, field-level checks run only when it is submitted for KYC review.
  legalName: z.string().trim().max(160).optional(),
  tradingName: z.string().trim().max(160).optional(),
  documentNumber: z.string().trim().max(32).optional(),
  billingEmail: z.string().trim().max(254).optional(),
  phoneE164: z.string().trim().max(32).optional(),
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).default('BR'),
  websiteUrl: z.string().trim().max(2_048).optional(),
  businessDescription: z.string().trim().max(1_000).optional(),
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
    allowedHeaders: ['authorization', 'content-type', 'idempotency-key', 'x-trace-id', 'cache-control', 'pragma'],
    exposedHeaders: ['x-trace-id', 'x-ratelimit-limit', 'x-ratelimit-remaining'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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

  app.addHook('onSend', async (_request, reply, payload) => {
    try {
      if (typeof payload === 'string') {
        if (payload.length < 32768) {
          (reply as any)._responsePayload = JSON.parse(payload);
        }
      } else if (payload && typeof payload === 'object') {
        (reply as any)._responsePayload = payload;
      }
    } catch {
      // Ignora erro de parsing de string não-JSON
    }
    return payload;
  });

  app.addHook('onResponse', async (request, reply) => {
    const traceId = reply.getHeader('x-trace-id');
    const latencyMs = Math.round(reply.elapsedTime);
    app.log.info({
      traceId,
      method: request.method,
      route: request.routeOptions.url,
      statusCode: reply.statusCode,
      latencyMs,
    }, 'request_completed');

    const merchant = (request as any).merchant;
    const url = request.url;
    if (merchant?.merchantId && url.startsWith('/v1/') && !url.includes('/dashboard/merchants/')) {
      const idempotencyKey = String(request.headers['idempotency-key'] ?? '').trim() || null;
      const ipAddress = getClientIp(request);
      const userAgent = typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null;
      const responsePayload = (reply as any)._responsePayload;

      setImmediate(() => {
        recordApiLog(database, {
          merchantId: merchant.merchantId,
          apiKeyId: (merchant as any).apiKeyId || null,
          method: request.method,
          path: url.split('?')[0],
          statusCode: reply.statusCode,
          latencyMs,
          ipAddress,
          userAgent,
          idempotencyKey,
          requestHeaders: request.headers as Record<string, unknown>,
          requestBody: request.body,
          responseBody: responsePayload,
        }).catch(() => {});
      });
    }
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

  let lastHealthCheck = 0;
  let lastHealthResult = { ok: true, status: 'ok', service: 'axion-pay-core', timestamp: new Date().toISOString() };

  app.get('/health', async (_request, reply) => {
    const now = Date.now();
    if (now - lastHealthCheck < 2000) {
      return lastHealthResult;
    }
    try {
      await Promise.all([database.query('SELECT 1'), cache.ping()]);
      lastHealthCheck = now;
      lastHealthResult = { ok: true, status: 'ok', service: 'axion-pay-core', timestamp: new Date().toISOString() };
      return lastHealthResult;
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
        error: 'Revise os campos obrigatórios antes de enviar o KYC.',
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

  app.get('/v1/card/config', async (_request, reply) => {
    if (!config.STRIPE_PUBLISHABLE_KEY || !config.STRIPE_SECRET_KEY) {
      return reply.code(503).send({ error: 'Pagamentos por cartão não estão configurados.' });
    }
    return { publishableKey: config.STRIPE_PUBLISHABLE_KEY, currency: 'BRL', minimumAmountCents: 100 };
  });

  app.post('/v1/card/payment-intents', async (request, reply) => {
    const presentedKey = readPresentedApiKey(request.headers);
    let principal: CardPaymentPrincipal | null = null;

    if (presentedKey) {
      const merchant = authenticateApiKey(presentedKey, config.apiKeys)
        ?? await authenticateStoredApiKey(presentedKey, database);

      if (!merchant) {
        if (presentedKey.startsWith('axp_') || request.headers['x-api-key']) {
          return reply.code(401).send({ error: 'API key ausente ou inválida.' });
        }
      } else {
        if (!hasScopes(merchant, ['charges:write']) && !hasScopes(merchant, ['card:write'])) {
          return reply.code(403).send({ error: 'Escopo insuficiente.' });
        }
        const window = Math.floor(Date.now() / 60_000);
        const rateKey = `rate-limit:${merchant.keyFingerprint}:${window}`;
        try {
          const current = await cache.incr(rateKey);
          if (current === 1) await cache.expire(rateKey, 70);
          if (current > config.RATE_LIMIT_PER_MINUTE) {
            return reply.code(429).send({ error: 'Limite de requisições excedido.' });
          }
        } catch {
          return reply.code(503).send({ error: 'Serviço temporariamente indisponível.' });
        }
        principal = { type: 'merchant', merchantId: merchant.merchantId, keyFingerprint: merchant.keyFingerprint };
      }
    }

    if (!principal) {
      const user = await requireDashboardUser(request, reply, database);
      if (!user) return;
      principal = { type: 'user', user };
    }

    const idempotencyKey = String(request.headers['idempotency-key'] ?? '').trim();
    if (!idempotencyKey || idempotencyKey.length > 255) {
      return reply.code(400).send({ error: 'Header Idempotency-Key é obrigatório.' });
    }
    const body = cardPaymentIntentSchema.parse(request.body);
    const receiptEmail = body.receiptEmail || body.customerEmail;
    try {
      return reply.code(201).send(
        await createCardPaymentIntent(
          database,
          config.STRIPE_SECRET_KEY,
          principal,
          body.amountCents,
          idempotencyKey,
          { receiptEmail, metadata: body.metadata },
        ),
      );
    } catch (error) {
      if (error instanceof CardPaymentError) return reply.code(error.statusCode).send({ error: error.message });
      throw error;
    }
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

  app.get('/v1/sandbox/validate', async (request, reply) => {
    const merchant = await requireMerchant(request, reply, ['sandbox:read'], cache, database);
    if (!merchant) return;

    return reply.code(200).send({
      environment: 'sandbox',
      authenticated: true,
      isolated: true,
      capabilities: ['health:read', 'sandbox:read'],
      livePaymentsAllowed: false,
      keyFingerprint: merchant.keyFingerprint,
    });
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

  // --- Merchant Outbound Webhooks Management ---
  app.post('/v1/merchant/webhooks', async (request, reply) => {
    const merchant = await requireMerchant(request, reply, ['charges:write'], cache, database);
    if (!merchant) return;

    try {
      const body = createMerchantWebhookSchema.parse(request.body);
      const webhook = await createMerchantWebhook(database, merchant.merchantId, body.url, body.events);
      return reply.code(201).send({ webhook });
    } catch (err) {
      if (err instanceof MerchantWebhookError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  app.get('/v1/merchant/webhooks', async (request, reply) => {
    const merchant = await requireMerchant(request, reply, ['charges:read'], cache, database);
    if (!merchant) return;

    const webhooks = await listMerchantWebhooks(database, merchant.merchantId);
    return reply.code(200).send({ webhooks });
  });

  app.delete('/v1/merchant/webhooks/:id', async (request, reply) => {
    const merchant = await requireMerchant(request, reply, ['charges:write'], cache, database);
    if (!merchant) return;

    try {
      const { id } = webhookIdParams.parse(request.params);
      const result = await deleteMerchantWebhook(database, merchant.merchantId, id);
      return reply.code(200).send(result);
    } catch (err) {
      if (err instanceof MerchantWebhookError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  app.get('/v1/merchant/webhooks/deliveries', async (request, reply) => {
    const merchant = await requireMerchant(request, reply, ['charges:read'], cache, database);
    if (!merchant) return;

    const deliveries = await listMerchantWebhookDeliveries(database, merchant.merchantId);
    return reply.code(200).send({ deliveries });
  });

  app.post('/v1/merchant/webhooks/:id/test', async (request, reply) => {
    const merchant = await requireMerchant(request, reply, ['charges:write'], cache, database);
    if (!merchant) return;

    try {
      const { id } = webhookIdParams.parse(request.params);
      const testResult = await testMerchantWebhook(database, merchant.merchantId, id);
      return reply.code(200).send(testResult);
    } catch (err) {
      if (err instanceof MerchantWebhookError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // --- Dashboard Merchant Webhooks Management ---
  app.get('/v1/dashboard/merchants/:merchantId/webhooks', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    const { merchantId } = merchantIdParams.parse(request.params);
    const owned = await database.query<{ id: string }>(
      `SELECT id FROM merchant_accounts WHERE id = $1 AND owner_auth_user_id = $2 LIMIT 1`,
      [merchantId, user.id],
    );
    if (!owned.rowCount) return reply.code(404).send({ error: 'Operação não encontrada.' });
    const webhooks = await listMerchantWebhooks(database, merchantId);
    return reply.code(200).send({ webhooks });
  });

  app.post('/v1/dashboard/merchants/:merchantId/webhooks', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    const { merchantId } = merchantIdParams.parse(request.params);
    const owned = await database.query<{ id: string }>(
      `SELECT id FROM merchant_accounts WHERE id = $1 AND owner_auth_user_id = $2 LIMIT 1`,
      [merchantId, user.id],
    );
    if (!owned.rowCount) return reply.code(404).send({ error: 'Operação não encontrada.' });
    try {
      const body = createMerchantWebhookSchema.parse(request.body);
      const webhook = await createMerchantWebhook(database, merchantId, body.url, body.events);
      return reply.code(201).send({ webhook });
    } catch (err) {
      if (err instanceof MerchantWebhookError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  app.delete('/v1/dashboard/merchants/:merchantId/webhooks/:id', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    const { merchantId, id } = dashboardMerchantWebhookParams.parse(request.params);
    const owned = await database.query<{ id: string }>(
      `SELECT id FROM merchant_accounts WHERE id = $1 AND owner_auth_user_id = $2 LIMIT 1`,
      [merchantId, user.id],
    );
    if (!owned.rowCount) return reply.code(404).send({ error: 'Operação não encontrada.' });
    try {
      const result = await deleteMerchantWebhook(database, merchantId, id);
      return reply.code(200).send(result);
    } catch (err) {
      if (err instanceof MerchantWebhookError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  app.get('/v1/dashboard/merchants/:merchantId/webhooks/deliveries', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    const { merchantId } = merchantIdParams.parse(request.params);
    const owned = await database.query<{ id: string }>(
      `SELECT id FROM merchant_accounts WHERE id = $1 AND owner_auth_user_id = $2 LIMIT 1`,
      [merchantId, user.id],
    );
    if (!owned.rowCount) return reply.code(404).send({ error: 'Operação não encontrada.' });
    const deliveries = await listMerchantWebhookDeliveries(database, merchantId);
    return reply.code(200).send({ deliveries });
  });

  app.post('/v1/dashboard/merchants/:merchantId/webhooks/:id/test', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    const { merchantId, id } = dashboardMerchantWebhookParams.parse(request.params);
    const owned = await database.query<{ id: string }>(
      `SELECT id FROM merchant_accounts WHERE id = $1 AND owner_auth_user_id = $2 LIMIT 1`,
      [merchantId, user.id],
    );
    if (!owned.rowCount) return reply.code(404).send({ error: 'Operação não encontrada.' });
    try {
      const testResult = await testMerchantWebhook(database, merchantId, id);
      return reply.code(200).send(testResult);
    } catch (err) {
      if (err instanceof MerchantWebhookError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // --- Merchant Recurring Subscriptions API S2S ---
  app.post('/v1/subscriptions', async (request, reply) => {
    const merchant = await requireMerchant(request, reply, ['charges:write'], cache, database);
    if (!merchant) return;

    if (!config.STRIPE_SECRET_KEY) {
      return reply.code(503).send({ error: 'Assinaturas por cartão ainda não configuradas.' });
    }

    const idempotencyKey = String(request.headers['idempotency-key'] ?? '').trim();
    if (!idempotencyKey || idempotencyKey.length > 255) {
      return reply.code(400).send({ error: 'Header Idempotency-Key é obrigatório e deve ter até 255 caracteres.' });
    }

    try {
      const body = createMerchantSubscriptionSchema.parse(request.body);
      const stripe = new Stripe(config.STRIPE_SECRET_KEY);
      const subscription = await createMerchantSubscription(database, stripe, merchant.merchantId, {
        ...body,
        idempotencyKey,
      });
      return reply.code(201).send(subscription);
    } catch (err) {
      if (err instanceof MerchantSubscriptionError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  app.get('/v1/subscriptions/:id', async (request, reply) => {
    const merchant = await requireMerchant(request, reply, ['charges:read'], cache, database);
    if (!merchant) return;

    try {
      const { id } = subscriptionIdParams.parse(request.params);
      const subscription = await getMerchantSubscription(database, merchant.merchantId, id);
      return reply.code(200).send(subscription);
    } catch (err) {
      if (err instanceof MerchantSubscriptionError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  app.post('/v1/subscriptions/:id/cancel', async (request, reply) => {
    const merchant = await requireMerchant(request, reply, ['charges:write'], cache, database);
    if (!merchant) return;

    if (!config.STRIPE_SECRET_KEY) {
      return reply.code(503).send({ error: 'Assinaturas por cartão ainda não configuradas.' });
    }

    try {
      const { id } = subscriptionIdParams.parse(request.params);
      const immediately = Boolean((request.body as Record<string, unknown> | undefined)?.immediately);
      const stripe = new Stripe(config.STRIPE_SECRET_KEY);
      const subscription = await cancelMerchantSubscription(database, stripe, merchant.merchantId, id, immediately);
      return reply.code(200).send(subscription);
    } catch (err) {
      if (err instanceof MerchantSubscriptionError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // --- Payment Links Public Endpoints ---
  app.get('/v1/payment-links/:id', async (request, reply) => {
    try {
      const { id } = paymentLinkIdParams.parse(request.params);
      const link = await getPublicPaymentLink(database, id);
      return reply.code(200).send(link);
    } catch (err) {
      if (err instanceof PaymentLinkError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  app.post('/v1/payment-links/:id/pay', async (request, reply) => {
    try {
      const { id } = paymentLinkIdParams.parse(request.params);
      const body = payPaymentLinkSchema.parse(request.body);
      const result = await processPaymentLinkPayment(
        database,
        orchestrator,
        config.STRIPE_SECRET_KEY,
        id,
        body,
      );
      return reply.code(201).send(result);
    } catch (err) {
      if (err instanceof PaymentLinkError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // --- Payment Links Dashboard Management ---
  app.get('/v1/dashboard/merchants/:merchantId/payment-links', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    const { merchantId } = merchantIdParams.parse(request.params);
    const owned = await database.query<{ id: string }>(
      `SELECT id FROM merchant_accounts WHERE id = $1 AND owner_auth_user_id = $2 LIMIT 1`,
      [merchantId, user.id],
    );
    if (!owned.rowCount) return reply.code(404).send({ error: 'Operação não encontrada.' });
    const links = await listMerchantPaymentLinks(database, merchantId);
    return reply.code(200).send({ links });
  });

  app.post('/v1/dashboard/merchants/:merchantId/payment-links', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    const { merchantId } = merchantIdParams.parse(request.params);
    const owned = await database.query<{ id: string }>(
      `SELECT id FROM merchant_accounts WHERE id = $1 AND owner_auth_user_id = $2 LIMIT 1`,
      [merchantId, user.id],
    );
    if (!owned.rowCount) return reply.code(404).send({ error: 'Operação não encontrada.' });

    try {
      const body = createPaymentLinkSchema.parse(request.body);
      const link = await createPaymentLink(database, merchantId, body);
      return reply.code(201).send({ link });
    } catch (err) {
      if (err instanceof PaymentLinkError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  app.delete('/v1/dashboard/merchants/:merchantId/payment-links/:id', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    const { merchantId, id } = dashboardPaymentLinkParams.parse(request.params);
    const owned = await database.query<{ id: string }>(
      `SELECT id FROM merchant_accounts WHERE id = $1 AND owner_auth_user_id = $2 LIMIT 1`,
      [merchantId, user.id],
    );
    if (!owned.rowCount) return reply.code(404).send({ error: 'Operação não encontrada.' });

    try {
      const result = await deletePaymentLink(database, merchantId, id);
      return reply.code(200).send(result);
    } catch (err) {
      if (err instanceof PaymentLinkError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // --- Payment Links S2S API ---
  app.get('/v1/payment-links', async (request, reply) => {
    const merchant = await requireMerchant(request, reply, ['charges:read'], cache, database);
    if (!merchant) return;
    const links = await listMerchantPaymentLinks(database, merchant.merchantId);
    return reply.code(200).send({ links });
  });

  app.post('/v1/payment-links', async (request, reply) => {
    const merchant = await requireMerchant(request, reply, ['charges:write'], cache, database);
    if (!merchant) return;

    try {
      const body = createPaymentLinkSchema.parse(request.body);
      const link = await createPaymentLink(database, merchant.merchantId, body);
      return reply.code(201).send({ link });
    } catch (err) {
      if (err instanceof PaymentLinkError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  app.delete('/v1/payment-links/:id', async (request, reply) => {
    const merchant = await requireMerchant(request, reply, ['charges:write'], cache, database);
    if (!merchant) return;

    try {
      const { id } = paymentLinkIdParams.parse(request.params);
      const result = await deletePaymentLink(database, merchant.merchantId, id);
      return reply.code(200).send(result);
    } catch (err) {
      if (err instanceof PaymentLinkError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // --- Merchant WhatsApp Notification Cadence Dashboard Routes ---
  app.get('/v1/dashboard/merchants/:merchantId/whatsapp/settings', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    const { merchantId } = merchantIdParams.parse(request.params);
    const owned = await database.query<{ id: string }>(
      `SELECT id FROM merchant_accounts WHERE id = $1 AND owner_auth_user_id = $2 LIMIT 1`,
      [merchantId, user.id],
    );
    if (!owned.rowCount) return reply.code(404).send({ error: 'Operação não encontrada.' });
    const settings = await getMerchantWhatsappSettings(database, merchantId);
    return reply.code(200).send(settings);
  });

  app.put('/v1/dashboard/merchants/:merchantId/whatsapp/settings', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    const { merchantId } = merchantIdParams.parse(request.params);
    const owned = await database.query<{ id: string }>(
      `SELECT id FROM merchant_accounts WHERE id = $1 AND owner_auth_user_id = $2 LIMIT 1`,
      [merchantId, user.id],
    );
    if (!owned.rowCount) return reply.code(404).send({ error: 'Operação não encontrada.' });
    const body = updateMerchantWhatsappSettingsSchema.parse(request.body);
    const settings = await saveMerchantWhatsappSettings(database, merchantId, body);
    return reply.code(200).send(settings);
  });

  app.post('/v1/dashboard/merchants/:merchantId/whatsapp/test', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    const { merchantId } = merchantIdParams.parse(request.params);
    const owned = await database.query<{ id: string }>(
      `SELECT id FROM merchant_accounts WHERE id = $1 AND owner_auth_user_id = $2 LIMIT 1`,
      [merchantId, user.id],
    );
    if (!owned.rowCount) return reply.code(404).send({ error: 'Operação não encontrada.' });
    const body = sendTestWhatsappNotificationSchema.parse(request.body);
    try {
      const result = await sendTestWhatsappNotification(database, merchantId, body.phone, body.eventType);
      return reply.code(200).send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message || 'Falha ao enviar mensagem de teste' });
    }
  });

  app.get('/v1/dashboard/merchants/:merchantId/whatsapp/logs', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    const { merchantId } = merchantIdParams.parse(request.params);
    const owned = await database.query<{ id: string }>(
      `SELECT id FROM merchant_accounts WHERE id = $1 AND owner_auth_user_id = $2 LIMIT 1`,
      [merchantId, user.id],
    );
    if (!owned.rowCount) return reply.code(404).send({ error: 'Operação não encontrada.' });
    const logs = await listMerchantWhatsappLogs(database, merchantId, 50);
    return reply.code(200).send({ logs });
  });

  // API Logs Explorer
  app.get('/v1/dashboard/merchants/:merchantId/api-logs', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    const { merchantId } = merchantIdParams.parse(request.params);
    const owned = await database.query<{ id: string }>(
      `SELECT id FROM merchant_accounts WHERE id = $1 AND owner_auth_user_id = $2 LIMIT 1`,
      [merchantId, user.id],
    );
    if (!owned.rowCount) return reply.code(404).send({ error: 'Operação não encontrada.' });

    const query = request.query as any;
    const logsData = await listMerchantApiLogs(database, merchantId, {
      limit: query?.limit ? parseInt(query.limit, 10) : 25,
      offset: query?.offset ? parseInt(query.offset, 10) : 0,
      method: query?.method,
      statusCode: query?.statusCode,
      search: query?.search,
    });
    return reply.code(200).send(logsData);
  });

  app.get('/v1/dashboard/merchants/:merchantId/api-logs/:id', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    const { merchantId, id } = dashboardMerchantWebhookParams.parse(request.params);
    const owned = await database.query<{ id: string }>(
      `SELECT id FROM merchant_accounts WHERE id = $1 AND owner_auth_user_id = $2 LIMIT 1`,
      [merchantId, user.id],
    );
    if (!owned.rowCount) return reply.code(404).send({ error: 'Operação não encontrada.' });

    const log = await getMerchantApiLogById(database, merchantId, id);
    if (!log) return reply.code(404).send({ error: 'Log de requisição não encontrado.' });
    return reply.code(200).send({ log });
  });

  app.delete('/v1/dashboard/merchants/:merchantId/api-logs', async (request, reply) => {
    const user = await requireDashboardUser(request, reply, database);
    if (!user) return;
    const { merchantId } = merchantIdParams.parse(request.params);
    const owned = await database.query<{ id: string }>(
      `SELECT id FROM merchant_accounts WHERE id = $1 AND owner_auth_user_id = $2 LIMIT 1`,
      [merchantId, user.id],
    );
    if (!owned.rowCount) return reply.code(404).send({ error: 'Operação não encontrada.' });

    const result = await clearMerchantApiLogs(database, merchantId);
    return reply.code(200).send({ success: true, ...result });
  });

  app.get('/v1/api-logs', async (request, reply) => {
    const merchant = await requireMerchant(request, reply, ['charges:read'], cache, database);
    if (!merchant) return;

    const query = request.query as any;
    const logsData = await listMerchantApiLogs(database, merchant.merchantId, {
      limit: query?.limit ? parseInt(query.limit, 10) : 25,
      offset: query?.offset ? parseInt(query.offset, 10) : 0,
      method: query?.method,
      statusCode: query?.statusCode,
      search: query?.search,
    });
    return reply.code(200).send(logsData);
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

function getClientIp(request: FastifyRequest): string {
  const cfIp = request.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) return cfIp.trim();
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return request.ip || '127.0.0.1';
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
  (request as any).merchant = principal;
  if (!hasScopes(principal, scopes)) {
    reply.code(403).send({ error: 'Escopo insuficiente.' });
    return null;
  }

  const isSandbox = principal.scopes.has('sandbox:read');
  const clientIp = getClientIp(request);
  const window = Math.floor(Date.now() / 60_000);

  // Chaves sandbox públicas possuem isolamento estrito por IP para evitar exaustão e DoS cruzado entre visitantes
  const rateKey = isSandbox
    ? `rate-limit:sandbox:${clientIp}:${window}`
    : `rate-limit:${principal.keyFingerprint}:${window}`;

  const limit = isSandbox
    ? 30 // 30 requisições/minuto por IP para a chave pública sandbox
    : config.RATE_LIMIT_PER_MINUTE;

  try {
    const current = await cache.incr(rateKey);
    if (current === 1) await cache.expire(rateKey, 70);
    reply.header('X-RateLimit-Limit', String(limit));
    reply.header('X-RateLimit-Remaining', String(Math.max(0, limit - current)));
    if (current > limit) {
      reply.code(429).send({
        error: isSandbox
          ? 'Limite de requisições sandbox excedido para o seu IP. Aguarde 1 minuto.'
          : 'Limite de requisições excedido.',
      });
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
