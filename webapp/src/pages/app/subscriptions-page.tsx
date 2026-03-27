import { Card } from '~/components/ui/card'

export function SubscriptionsPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {[
        ['Plano atual', 'Gateway Scale', 'Billing e checkout PRO habilitados.'],
        ['Status', 'active', 'Estrutura pronta para pending_payment, paused e canceled.'],
        ['Proximo passo', 'Recorrencia', 'Depende de endpoints especificos de assinatura no backend.'],
      ].map(([label, value, text]) => (
        <Card key={label}>
          <div className="text-sm text-mist">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
          <p className="mt-3 text-sm leading-7 text-mist">{text}</p>
        </Card>
      ))}
    </div>
  )
}

