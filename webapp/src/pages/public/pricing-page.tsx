import { pricingPlans } from '~/config/marketing'
import { SectionHeading } from '~/components/shared/section-heading'
import { Badge } from '~/components/ui/badge'
import { Card } from '~/components/ui/card'

export function PricingPage() {
  return (
    <div className="section-space">
      <div className="page-wrap space-y-10">
        <SectionHeading
          eyebrow="Precos"
          title="Modelo comercial pensado para conversao, operacao e negociacao futura."
          description="Os valores abaixo estao estruturados como defaults configuraveis no frontend. Regras finais de repasse, link e recorrencia permanecem documentadas como mock ou dependentes de backend."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <Card key={plan.id} className={plan.highlight ? 'border-neon-500/30 shadow-glow' : ''}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                {plan.highlight ? <Badge className="text-neon-300">Scale</Badge> : null}
              </div>
              <div className="mt-4 text-3xl font-semibold text-white">{plan.priceLabel}</div>
              <p className="mt-3 text-sm leading-7 text-mist">{plan.description}</p>
              <ul className="mt-6 space-y-3 text-sm text-mist">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

