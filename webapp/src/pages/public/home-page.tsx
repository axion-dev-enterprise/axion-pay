import { ArrowRight, BadgeCheck, CreditCard, QrCode, ShieldCheck, Sparkles, Webhook } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { pricingPlans } from '~/config/marketing'
import { CheckoutPreview } from '~/components/app/checkout-preview'
import { SectionHeading } from '~/components/shared/section-heading'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { demoCheckoutConfig, demoCheckoutProduct } from '~/mocks/fixtures'

const stats = [
  { label: 'Uptime alvo', value: '99,95%' },
  { label: 'PIX emitido', value: '< 3 segundos' },
  { label: 'Operacao API-first', value: 'End-to-end' },
]

export function HomePage() {
  return (
    <div>
      <section className="section-space">
        <div className="page-wrap grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8">
            <Badge className="border-neon-500/30 bg-neon-500/10 text-neon-300">
              Rebranding fintech premium da AXION
            </Badge>
            <div className="space-y-5">
              <h1 className="headline">
                Gateway para PIX, cartao e checkout PRO com cara de produto serio.
              </h1>
              <p className="subheadline">
                O AXION-PAY centraliza cobranca, configuracao de checkout, API, webhooks e operacao
                financeira em uma experiencia premium para merchants e squads tecnicos.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/register">
                  Criar conta <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link to="/checkout-pro">Ver Checkout PRO</Link>
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {stats.map((item) => (
                <Card key={item.label}>
                  <div className="text-sm text-mist">{item.label}</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{item.value}</div>
                </Card>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <CheckoutPreview config={demoCheckoutConfig} product={demoCheckoutProduct} />
          </motion.div>
        </div>
      </section>

      <section className="section-space border-y border-white/5 bg-white/[0.02]">
        <div className="page-wrap">
          <SectionHeading
            eyebrow="Produto"
            title="AXION-PAY foi redesenhado para vender melhor e operar com menos friccao."
            description="A proposta nao e so cobrar. E entregar um hub financeiro com checkout customizavel, eventos claros e camada de integracao previsivel."
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {[
              { icon: QrCode, title: 'PIX instantaneo', text: 'Emissao rapida, feedback visual confiavel e polling elegante para status.' },
              { icon: CreditCard, title: 'Cartao com controle', text: 'Fluxo pronto para autorizacao, captura, cancelamento e conciliacao.' },
              { icon: Webhook, title: 'API e webhooks', text: 'Contratos organizados para squads dev e operacao monitorarem tudo.' },
            ].map((item) => (
              <Card key={item.title} className="h-full">
                <item.icon className="h-8 w-8 text-neon-300" />
                <h3 className="mt-5 text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-mist">{item.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section-space">
        <div className="page-wrap">
          <SectionHeading
            eyebrow="Credibilidade"
            title="Indicadores e narrativa de fintech confiavel."
            description="A nova interface comunica velocidade, seguranca, previsibilidade operacional e onboarding simples para time tecnico e negocio."
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-4">
            {[
              ['Volume roteado', 'R$ 14,8 mi', 'mock configuravel'],
              ['Taxa de aprovacao', '96,4%', 'media operacional'],
              ['Eventos entregues', '1,2M', '30 dias'],
              ['Repasse previsto', 'D+1 / D+14', 'por configuracao'],
            ].map(([label, value, helper]) => (
              <Card key={label}>
                <div className="text-sm text-mist">{label}</div>
                <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
                <div className="mt-2 text-sm text-mist">{helper}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section-space border-y border-white/5 bg-white/[0.02]">
        <div className="page-wrap">
          <SectionHeading
            eyebrow="Taxas"
            title="Estrutura comercial clara, editavel e pronta para negociacao."
            description="As taxas abaixo sao apresentadas como defaults comerciais mockados para frontend. O motor aceita ajuste conforme operacao e plano."
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <Card key={plan.id} className={plan.highlight ? 'border-neon-500/30 shadow-glow' : ''}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                  {plan.highlight ? <Badge className="text-neon-300">Mais escolhido</Badge> : null}
                </div>
                <div className="mt-4 text-3xl font-semibold text-white">{plan.priceLabel}</div>
                <p className="mt-3 text-sm leading-7 text-mist">{plan.description}</p>
                <ul className="mt-6 space-y-3 text-sm text-mist">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <BadgeCheck className="h-4 w-4 text-neon-300" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section-space">
        <div className="page-wrap grid gap-6 lg:grid-cols-3">
          {[
            ['Seguranca', 'Mensagens claras, estados de pagamento e visual de confianca para merchants e compradores.', ShieldCheck],
            ['Conversao', 'Checkout responsivo, destaque para PIX e resumo de compra sem ruído.', Sparkles],
            ['Operacao', 'Painel com chaves, transacoes, integracoes e configuracao de checkout na mesma camada.', CreditCard],
          ].map(([title, text, Icon]) => (
            <Card key={title as string} className="h-full">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neon-500/12">
                <Icon className="h-6 w-6 text-neon-300" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-white">{title as string}</h3>
              <p className="mt-3 text-sm leading-7 text-mist">{text as string}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}

