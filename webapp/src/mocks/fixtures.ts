import type { CheckoutProduct, CheckoutProConfig } from '~/types/domain'

export const demoCheckoutConfig: CheckoutProConfig = {
  brandName: 'AXION Store',
  heroTitle: 'Pague com seguranca em segundos',
  heroSubtitle: 'Checkout desenhado para aumentar conversao com confianca visual e feedback claro.',
  primaryColor: '#17c96f',
  accentColor: '#4ad9d2',
  surfaceTone: 'glass',
  highlightPix: true,
  showCountdown: true,
  testimonialText: 'Mais de 12 mil pagamentos concluidos com UX consistente.',
  footerMessage: 'Pagamento seguro com criptografia ponta a ponta.',
}

export const demoCheckoutProduct: CheckoutProduct = {
  id: 'demo-checkout',
  slug: 'plano-scale',
  title: 'Plano Scale AXION-PAY',
  description: 'Acesso ao checkout PRO, webhooks, API keys por squad e relatorios operacionais.',
  price: 297.9,
  currency: 'BRL',
  theme: 'black',
  template: 'premium',
  appearance: {
    brandName: 'AXION Store',
    primary: '#17c96f',
    accent: '#4ad9d2',
  },
  paymentConfig: {
    allowedMethods: ['pix', 'card'],
    maxInstallments: 6,
  },
  features: ['PIX', 'Cartao', 'Webhook', 'Branding'],
  socialProof: [
    { label: 'Aprovacao', value: '96,4%', caption: 'media operacional' },
    { label: 'PIX', value: '< 3s', caption: 'geracao media' },
  ],
}

export const webhookLogs = [
  {
    id: 'evt_001',
    event: 'payment.paid',
    target: 'https://merchant.axion.com/webhooks/payments',
    status: 'delivered',
    createdAt: '2026-03-26T10:40:00.000Z',
  },
  {
    id: 'evt_002',
    event: 'payment.failed',
    target: 'https://merchant.axion.com/webhooks/risk',
    status: 'retry_pending',
    createdAt: '2026-03-26T09:18:00.000Z',
  },
]

