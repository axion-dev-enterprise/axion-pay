export type UserRole = 'merchant' | 'admin'
export type PaymentMethod = 'pix' | 'card'
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'authorized'
  | 'paid'
  | 'failed'
  | 'canceled'
  | 'expired'
  | 'refunded'
  | 'chargeback'
export type IntegrationStatus = 'connected' | 'disconnected' | 'invalid' | 'pending'
export type ApiKeyStatus = 'active' | 'revoked'

export interface MerchantUser {
  id: string
  name: string
  email: string
  whatsapp?: string | null
  company?: string | null
  status: string
  role: UserRole
  emailVerified: boolean
  docsSentAt?: string | null
}

export interface ApiKeyRecord {
  id: string
  label: string
  key?: string
  maskedKey: string
  status: ApiKeyStatus
  createdAt?: string | null
  lastUsedAt?: string | null
}

export interface StatusSlice {
  status: string
  count: number
  volume: number
}

export interface PayTagInsight {
  id: string
  name: string
  transactionCount: number
  totalVolume: number
  statusBreakdown: StatusSlice[]
  lastTransactionAt?: string | null
}

export interface MerchantOverview {
  payTags: number
  tokens: number
  documents: number
  availableBalance: number
  totalVolume: number
  transactionCount: number
  approvalRate: number
  pixShare: number
  cardShare: number
  statusBreakdown: StatusSlice[]
  payTagInsights: PayTagInsight[]
}

export interface TransactionCustomer {
  id?: string | null
  name?: string | null
  email?: string | null
  document?: string | null
}

export interface PaymentEvent {
  id: string
  type: string
  createdAt?: string | null
  payload?: Record<string, unknown> | null
}

export interface TransactionRecord {
  id: string
  amount: number
  currency: string
  method: PaymentMethod
  status: PaymentStatus
  provider?: string | null
  providerReference?: string | null
  capture?: boolean
  customer?: TransactionCustomer | null
  metadata?: Record<string, unknown> | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface ClientInsight {
  customerId: string
  customerName: string
  transactions: number
  volume: number
}

export interface IntegrationService {
  id: string
  name: string
  enabled: boolean
  status: IntegrationStatus
  endpoint: string
  apiKey: string
  notes: string
}

export interface CheckoutAppearance {
  brandName?: string
  logoUrl?: string
  primary?: string
  accent?: string
  background?: string
  surface?: string
  text?: string
  muted?: string
  radius?: number
  buttonRadius?: number
}

export interface CheckoutPaymentConfig {
  allowedMethods: PaymentMethod[]
  maxInstallments?: number
  callbackUrl?: string
  allowSplit?: boolean
  allowPartialRefund?: boolean
  enableThreeDS?: boolean
  riskLevel?: string
}

export interface CheckoutProduct {
  id: string
  userId?: string
  payTagId?: string | null
  slug: string
  title: string
  description: string
  price: number
  currency: string
  theme: 'black' | 'white'
  template: 'classic' | 'premium'
  appearance?: CheckoutAppearance | null
  paymentConfig?: CheckoutPaymentConfig | null
  features: string[]
  socialProof: Array<{ label: string; value: string; caption?: string }>
  createdAt?: string | null
  updatedAt?: string | null
  payTagName?: string | null
}

export interface CheckoutProConfig {
  brandName: string
  heroTitle: string
  heroSubtitle: string
  primaryColor: string
  accentColor: string
  surfaceTone: string
  highlightPix: boolean
  showCountdown: boolean
  testimonialText: string
  footerMessage: string
  updatedAt?: string | null
}

export interface PaymentArtifacts {
  pixPayload?: string
  pixQrCodeBase64?: string
  pixTicketUrl?: string
  pixExpiresAt?: string
}

export interface CheckoutPaymentResult extends PaymentArtifacts {
  transaction: TransactionRecord
}

export interface PricingPlan {
  id: string
  name: string
  priceLabel: string
  highlight?: boolean
  description: string
  features: string[]
}

export interface DocSection {
  id: string
  title: string
  summary: string
  code?: string
}

