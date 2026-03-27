import type {
  ApiKeyRecord,
  CheckoutProduct,
  CheckoutProConfig,
  ClientInsight,
  IntegrationService,
  MerchantOverview,
  MerchantUser,
  PaymentEvent,
  TransactionRecord,
} from '~/types/domain'

function toString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

export function mapUser(raw: any): MerchantUser {
  return {
    id: toString(raw?.id),
    name: toString(raw?.name, 'Operacao AXION'),
    email: toString(raw?.email),
    whatsapp: raw?.whatsapp ? String(raw.whatsapp) : null,
    company: raw?.company ? String(raw.company) : null,
    status: toString(raw?.status, 'pending'),
    role: raw?.role === 'admin' ? 'admin' : 'merchant',
    emailVerified: Boolean(raw?.email_verified ?? raw?.emailVerified ?? false),
    docsSentAt: raw?.docs_sent_at ?? raw?.docsSentAt ?? null,
  }
}

export function mapApiKey(raw: any, plainKey?: string): ApiKeyRecord {
  return {
    id: toString(raw?.id || raw?.key || 'temp-key'),
    label: toString(raw?.label, 'API key'),
    key: plainKey,
    maskedKey: plainKey || toString(raw?.key_masked || raw?.maskedKey || raw?.key || 'sk_live_***'),
    status: raw?.revoked_at ? 'revoked' : 'active',
    createdAt: raw?.created_at ?? raw?.createdAt ?? null,
    lastUsedAt: raw?.last_used_at ?? raw?.lastUsedAt ?? null,
  }
}

export function mapTransaction(raw: any): TransactionRecord {
  return {
    id: toString(raw?.id),
    amount: Number(raw?.amount ?? 0),
    currency: toString(raw?.currency, 'BRL'),
    method: raw?.method === 'card' ? 'card' : 'pix',
    status: (raw?.status || 'pending') as TransactionRecord['status'],
    provider: raw?.provider ? String(raw.provider) : null,
    providerReference: raw?.provider_reference ?? raw?.providerReference ?? null,
    capture: raw?.capture !== undefined ? Boolean(raw.capture) : undefined,
    customer: raw?.customer ?? null,
    metadata: raw?.metadata ?? null,
    createdAt: raw?.created_at ?? raw?.createdAt ?? null,
    updatedAt: raw?.updated_at ?? raw?.updatedAt ?? null,
  }
}

export function mapOverview(raw: any, recentTransactions: any[] = []): MerchantOverview {
  const transactions = recentTransactions.map(mapTransaction)
  const paid = transactions.filter((item) => item.status === 'paid').length
  const pix = transactions.filter((item) => item.method === 'pix').length
  const card = transactions.filter((item) => item.method === 'card').length

  return {
    payTags: Number(raw?.payTags ?? 0),
    tokens: Number(raw?.tokens ?? 0),
    documents: Number(raw?.documents ?? 0),
    availableBalance: Number(raw?.availableBalance ?? 0),
    totalVolume: Number(raw?.totalVolume ?? 0),
    transactionCount: Number(raw?.transactionCount ?? 0),
    approvalRate: transactions.length ? (paid / transactions.length) * 100 : 0,
    pixShare: transactions.length ? (pix / transactions.length) * 100 : 0,
    cardShare: transactions.length ? (card / transactions.length) * 100 : 0,
    statusBreakdown: Array.isArray(raw?.statusBreakdown) ? raw.statusBreakdown : [],
    payTagInsights: Array.isArray(raw?.payTagInsights)
      ? raw.payTagInsights.map((item: any) => ({
          id: toString(item?.id),
          name: toString(item?.name),
          transactionCount: Number(item?.stats?.transactionCount ?? 0),
          totalVolume: Number(item?.stats?.totalVolume ?? 0),
          statusBreakdown: Array.isArray(item?.stats?.statusBreakdown) ? item.stats.statusBreakdown : [],
          lastTransactionAt:
            item?.stats?.lastTransaction?.created_at ?? item?.stats?.lastTransaction?.createdAt ?? null,
        }))
      : [],
  }
}

export function mapClient(raw: any): ClientInsight {
  return {
    customerId: toString(raw?.customerId, 'untracked'),
    customerName: toString(raw?.customerName, 'Cliente'),
    transactions: Number(raw?.transactions ?? 0),
    volume: Number(raw?.volume ?? 0),
  }
}

export function mapIntegration(raw: any): IntegrationService {
  return {
    id: toString(raw?.id),
    name: toString(raw?.name),
    enabled: Boolean(raw?.enabled),
    status: (raw?.status || 'disconnected') as IntegrationService['status'],
    endpoint: toString(raw?.endpoint),
    apiKey: toString(raw?.apiKey),
    notes: toString(raw?.notes),
  }
}

export function mapCheckoutProConfig(raw: any): CheckoutProConfig {
  return {
    brandName: toString(raw?.brandName, 'Minha marca'),
    heroTitle: toString(raw?.heroTitle, 'Receba em segundos com checkout premium'),
    heroSubtitle: toString(raw?.heroSubtitle, 'Fluxo otimizado para PIX, cartao e confianca visual.'),
    primaryColor: toString(raw?.primaryColor, '#17c96f'),
    accentColor: toString(raw?.accentColor, '#4ad9d2'),
    surfaceTone: toString(raw?.surfaceTone, 'glass'),
    highlightPix: Boolean(raw?.highlightPix ?? true),
    showCountdown: Boolean(raw?.showCountdown ?? true),
    testimonialText: toString(raw?.testimonialText, 'Milhares de pagamentos processados com estabilidade.'),
    footerMessage: toString(raw?.footerMessage, 'Pagamento criptografado e roteado com seguranca.'),
    updatedAt: raw?.updatedAt ?? null,
  }
}

export function mapCheckoutProduct(raw: any): CheckoutProduct {
  return {
    id: toString(raw?.id),
    userId: raw?.userId ? String(raw.userId) : undefined,
    payTagId: raw?.payTagId ?? null,
    slug: toString(raw?.slug),
    title: toString(raw?.title),
    description: toString(raw?.description),
    price: Number(raw?.price ?? 0),
    currency: toString(raw?.currency, 'BRL'),
    theme: raw?.theme === 'white' ? 'white' : 'black',
    template: raw?.template === 'premium' ? 'premium' : 'classic',
    appearance: raw?.appearance ?? null,
    paymentConfig: raw?.paymentConfig
      ? {
          ...raw.paymentConfig,
          allowedMethods: Array.isArray(raw.paymentConfig.allowedMethods)
            ? raw.paymentConfig.allowedMethods
            : ['pix', 'card'],
        }
      : { allowedMethods: ['pix', 'card'] },
    features: Array.isArray(raw?.features) ? raw.features : [],
    socialProof: Array.isArray(raw?.socialProof) ? raw.socialProof : [],
    createdAt: raw?.createdAt ?? null,
    updatedAt: raw?.updatedAt ?? null,
    payTagName: raw?.payTag?.name ?? raw?.pay_tag?.name ?? null,
  }
}

export function mapPaymentEvents(raw: any[]): PaymentEvent[] {
  return raw.map((event) => ({
    id: toString(event?.id),
    type: toString(event?.type, 'event'),
    createdAt: event?.created_at ?? event?.createdAt ?? null,
    payload: event?.payload ?? null,
  }))
}
