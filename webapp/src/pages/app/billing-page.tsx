import { Card } from '~/components/ui/card'

export function BillingPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {[
        ['PIX', 'Estados de pending, paid, expired e refunded tratados no design system.'],
        ['Cartao', 'Area pronta para captura, cancelamento e chargeback future-ready.'],
        ['Repasse', 'Estrutura visual pronta para D+1, D+14 e regras comerciais configuraveis.'],
      ].map(([title, text]) => (
        <Card key={title}>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="mt-3 text-sm leading-7 text-mist">{text}</p>
        </Card>
      ))}
    </div>
  )
}

