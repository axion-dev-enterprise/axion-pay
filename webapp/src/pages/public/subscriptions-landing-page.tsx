import { SectionHeading } from '~/components/shared/section-heading'
import { Card } from '~/components/ui/card'

export function SubscriptionsLandingPage() {
  return (
    <div className="section-space">
      <div className="page-wrap space-y-10">
        <SectionHeading
          eyebrow="Assinaturas"
          title="Camada pronta para recorrencia e billing futuro sem redesenhar a arquitetura."
          description="O frontend ja trata assinaturas como modulo de produto, nao como detalhe secundario."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            ['Status', 'Trial, active, pending_payment, overdue, canceled e paused preparados para UX.'],
            ['Upgrade', 'Area do merchant ja reserva espaco para troca de plano e historico.'],
            ['AXION stack', 'Base visual compatibilizada com produtos do ecossistema AXION.'],
          ].map(([title, text]) => (
            <Card key={title}>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-mist">{text}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

