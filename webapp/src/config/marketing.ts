import type { DocSection, PricingPlan } from '~/types/domain'

export const pricingPlans: PricingPlan[] = [
  {
    id: 'start',
    name: 'Gateway Start',
    priceLabel: 'PIX 0,89% | Cartao 3,29%',
    description: 'Entrada rapida para operacoes digitais com checkout pronto e API essencial.',
    features: ['PIX imediato', 'Checkout PRO basico', 'Dashboard merchant', 'Webhooks'],
  },
  {
    id: 'scale',
    name: 'Gateway Scale',
    priceLabel: 'PIX 0,69% | Cartao 2,99%',
    highlight: true,
    description: 'Operacao com maior volume, melhor aprovacao e configuracao de checkout por marca.',
    features: ['Tudo do Start', 'API keys por squad', 'Configuracao de branding', 'Relatorios'],
  },
  {
    id: 'enterprise',
    name: 'Gateway Enterprise',
    priceLabel: 'Sob consulta',
    description: 'Para operacoes com roteamento, white-label, volume alto e roadmap financeiro dedicado.',
    features: ['Split futuro', 'SLA dedicado', 'Onboarding tecnico', 'Prioridade de roadmap'],
  },
]

export const docSections: DocSection[] = [
  {
    id: 'auth',
    title: 'Autenticacao',
    summary: 'Use x-api-key ou Authorization Bearer para criar e consultar pagamentos.',
    code: `curl -X POST https://pay.axionenterprise.cloud/payments/pix \\\n+  -H "x-api-key: sk_live_xxx" \\\n+  -H "Idempotency-Key: charge-001" \\\n+  -H "Content-Type: application/json" \\\n+  -d '{"amount":149.9,"customer":{"name":"Ana Souza","email":"ana@cliente.com"}}'`,
  },
  {
    id: 'pix',
    title: 'PIX',
    summary: 'Crie cobrancas com QR Code, payload copia e cola e expiracao controlada.',
    code: `{\n+  "ok": true,\n+  "transaction": { "status": "pending", "method": "pix" },\n+  "pix_payload": "00020126...",\n+  "pix_expires_at": "2026-03-26T14:30:00.000Z"\n+}`,
  },
  {
    id: 'card',
    title: 'Cartao',
    summary: 'Fluxo preparado para autorizacao, captura, cancelamento e estorno parcial.',
    code: `POST /payments/card\n+{\n+  "amount": 297.9,\n+  "currency": "BRL",\n+  "customer": { "name": "Joao Pereira" },\n+  "card_hash": "tok_xxx"\n+}`,
  },
  {
    id: 'webhooks',
    title: 'Webhooks',
    summary: 'Receba atualizacoes de pagamento e reconciliacao em tempo real.',
    code: `{\n+  "event": "payment.paid",\n+  "transaction_id": "tx_123",\n+  "provider_reference": "mp_456"\n+}`,
  },
]
