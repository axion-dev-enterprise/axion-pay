import { SectionHeading } from '~/components/shared/section-heading'
import { Card } from '~/components/ui/card'

export function ContactPage() {
  return (
    <div className="section-space">
      <div className="page-wrap space-y-10">
        <SectionHeading
          eyebrow="Contato"
          title="Estrutura comercial preparada para demo, onboarding e negociacao enterprise."
          description="A pagina segue comercial, mas ja conversa com o posicionamento de produto real: gateway, checkout, API e operacao financeira."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <h3 className="text-lg font-semibold text-white">Comercial</h3>
            <p className="mt-3 text-sm text-mist">contato@axionenterprise.cloud</p>
          </Card>
          <Card>
            <h3 className="text-lg font-semibold text-white">Suporte tecnico</h3>
            <p className="mt-3 text-sm text-mist">api@pay.axionenterprise.cloud</p>
          </Card>
          <Card>
            <h3 className="text-lg font-semibold text-white">WhatsApp</h3>
            <p className="mt-3 text-sm text-mist">wa.me/5500000000000</p>
          </Card>
        </div>
      </div>
    </div>
  )
}

