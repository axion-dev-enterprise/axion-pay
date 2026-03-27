import {
  Activity,
  BookOpen,
  CreditCard,
  Gauge,
  KeyRound,
  Link2,
  PanelLeft,
  Receipt,
  Settings,
  Store,
  Wallet,
  Webhook,
} from 'lucide-react'

export const marketingNav = [
  { href: '/pix', label: 'PIX' },
  { href: '/cartao', label: 'Cartao' },
  { href: '/checkout-pro', label: 'Checkout PRO' },
  { href: '/api', label: 'API' },
  { href: '/sdk', label: 'SDK' },
  { href: '/precos', label: 'Precos' },
  { href: '/docs', label: 'Docs' },
]

export const appNav = [
  { href: '/app/dashboard', label: 'Dashboard', icon: Gauge },
  { href: '/app/transacoes', label: 'Transacoes', icon: Activity },
  { href: '/app/cobrancas', label: 'Cobrancas', icon: Receipt },
  { href: '/app/clientes', label: 'Clientes', icon: Store },
  { href: '/app/checkout-pro', label: 'Checkout PRO', icon: PanelLeft },
  { href: '/app/webhooks', label: 'Webhooks', icon: Webhook },
  { href: '/app/api-keys', label: 'API Keys', icon: KeyRound },
  { href: '/app/integracoes', label: 'Integracoes', icon: Link2 },
  { href: '/app/assinaturas', label: 'Assinaturas', icon: Wallet },
  { href: '/app/relatorios', label: 'Relatorios', icon: CreditCard },
  { href: '/app/settings', label: 'Settings', icon: Settings },
  { href: '/app/documentacao', label: 'Documentacao', icon: BookOpen },
]

