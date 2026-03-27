import { Card } from '~/components/ui/card'
import { StatusBadge } from '~/components/shared/status-badge'
import type { TransactionRecord } from '~/types/domain'
import { formatCurrency, formatDate } from '~/utils/formatters'

export function TransactionTable({ items }: { items: TransactionRecord[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="border-b border-white/5 bg-white/[0.03] text-xs uppercase tracking-[0.2em] text-mist">
            <tr>
              <th className="px-4 py-4">ID</th>
              <th className="px-4 py-4">Metodo</th>
              <th className="px-4 py-4">Cliente</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4">Valor</th>
              <th className="px-4 py-4">Criado</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-white/5 last:border-0">
                <td className="px-4 py-4 font-mono text-xs text-white">{item.id}</td>
                <td className="px-4 py-4 text-sm text-white">{item.method.toUpperCase()}</td>
                <td className="px-4 py-4 text-sm text-mist">
                  {item.customer?.name || item.customer?.email || 'Nao informado'}
                </td>
                <td className="px-4 py-4">
                  <StatusBadge value={item.status} />
                </td>
                <td className="px-4 py-4 text-sm text-white">{formatCurrency(item.amount, item.currency)}</td>
                <td className="px-4 py-4 text-sm text-mist">{formatDate(item.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

