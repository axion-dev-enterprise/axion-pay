import { useQuery } from '@tanstack/react-query'
import { Banknote, FileKey2, Landmark, Percent } from 'lucide-react'
import { KpiCard } from '~/components/app/kpi-card'
import { TransactionTable } from '~/components/app/transaction-table'
import { EmptyState } from '~/components/shared/empty-state'
import { getOverview } from '~/services/api/dashboard'
import { formatCompactCurrency, formatNumber, formatPercent } from '~/utils/formatters'

export function DashboardPage() {
  const overviewQuery = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: getOverview,
  })

  const overview = overviewQuery.data?.overview
  const transactions = overviewQuery.data?.recentTransactions || []

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <KpiCard
          label="Volume total"
          value={formatCompactCurrency(overview?.totalVolume || 0)}
          helper="volume somado no backend atual"
          icon={<Landmark className="h-5 w-5" />}
        />
        <KpiCard
          label="Saldo estimado"
          value={formatCompactCurrency(overview?.availableBalance || 0)}
          helper="baseado em volume menos reservas"
          icon={<Banknote className="h-5 w-5" />}
        />
        <KpiCard
          label="Aprovacao"
          value={formatPercent(overview?.approvalRate || 0)}
          helper="sobre transacoes recentes"
          icon={<Percent className="h-5 w-5" />}
        />
        <KpiCard
          label="API keys"
          value={formatNumber(overview?.tokens || 0)}
          helper="tokens ativos no merchant"
          icon={<FileKey2 className="h-5 w-5" />}
        />
      </div>

      {transactions.length ? (
        <TransactionTable items={transactions} />
      ) : (
        <EmptyState
          title="Sem transacoes recentes"
          description="O overview do merchant ainda nao encontrou pagamentos vinculados ao usuario ou pay-tags."
        />
      )}
    </div>
  )
}

