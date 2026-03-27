import { SectionHeading } from '~/components/shared/section-heading'
import { Card } from '~/components/ui/card'

export function CardPage() {
  return (
    <div className="section-space">
      <div className="page-wrap space-y-10">
        <SectionHeading
          eyebrow="Cartao"
          title="Fluxo de cartao com linguagem confiavel para autorizacao, captura e conciliacao."
          description="O AXION-PAY organiza feedbacks de pagamento para merchants e compradores sem esconder o que esta processando."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            ['Aprovacao', 'Interface pronta para refletir autorizacao, captura e falha sem mensagens vagas.'],
            ['Checkout fluido', 'Resumo de pedido, campos claros e experiencia mobile-first.'],
            ['Roadmap pronto', 'Parcelamento, antifraude e roteamento ficam preparados na arquitetura.'],
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
