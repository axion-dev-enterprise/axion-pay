import { Card } from '~/components/ui/card'
import { webhookLogs } from '~/mocks/fixtures'
import { formatDate } from '~/utils/formatters'

export function WebhooksPage() {
  return (
    <div className="grid gap-6">
      {webhookLogs.map((item) => (
        <Card key={item.id}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">{item.event}</h3>
              <div className="mt-2 text-sm text-mist">{item.target}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-white">{item.status}</div>
              <div className="mt-2 text-sm text-mist">{formatDate(item.createdAt)}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

