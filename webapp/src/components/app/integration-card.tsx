import { Card } from '~/components/ui/card'
import { StatusBadge } from '~/components/shared/status-badge'
import type { IntegrationService } from '~/types/domain'

export function IntegrationCard({ service }: { service: IntegrationService }) {
  return (
    <Card className="h-full">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">{service.name}</h3>
          <p className="text-sm text-mist">{service.notes || 'Sem observacoes configuradas.'}</p>
        </div>
        <StatusBadge value={service.status} />
      </div>
      <div className="mt-5 space-y-2 text-sm text-mist">
        <div>Endpoint: {service.endpoint || 'Nao configurado'}</div>
        <div>Modo: {service.enabled ? 'Ativo' : 'Desativado'}</div>
      </div>
    </Card>
  )
}

