import { SectionHeading } from '~/components/shared/section-heading'
import { Card } from '~/components/ui/card'

export function SdkPage() {
  return (
    <div className="section-space">
      <div className="page-wrap space-y-10">
        <SectionHeading
          eyebrow="SDK"
          title="Guia de onboarding para times dev sem ruido visual e sem lacunas de fluxo."
          description="A base do frontend prepara a futura area de SDK com exemplos JS/TS, fluxos de cobranca e boas praticas de integracao."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            ['Instalacao', 'Orientacao enxuta para conectar o merchant ao gateway sem adivinhar headers e estados.'],
            ['Exemplos', 'Snippets para criar cobranca, consultar status e configurar checkout.'],
            ['Boas praticas', 'Idempotencia, webhooks, retries e tratamento de estados financeiros.'],
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

