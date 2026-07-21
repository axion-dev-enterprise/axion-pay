import { useQuery } from '@tanstack/react-query'
import { EmptyState } from '~/components/shared/empty-state'
import { Card } from '~/components/ui/card'
import { getClients } from '~/services/api/dashboard'
import type { ClientInsight } from '~/types/domain'
import { formatCompactCurrency, formatNumber } from '~/utils/formatters'

export function ClientsPage() {
  const clientsQuery = useQuery({
    queryKey: ['clients'],
    queryFn: getClients,
  })

  if (!clientsQuery.data?.length) {
    return (
      <EmptyState
        title="Sem clientes agregados"
        description="O endpoint /api/dashboard/clients ainda nao encontrou volume associado."
      />
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {clientsQuery.data.map((client: ClientInsight) => (
        <Card key={client.customerId}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">{client.customerName}</h3>
              <div className="mt-2 text-sm text-mist">{client.customerId}</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-semibold text-white">{formatCompactCurrency(client.volume)}</div>
              <div className="text-sm text-mist">{formatNumber(client.transactions)} transacoes</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
