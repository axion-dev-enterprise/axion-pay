import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { IntegrationCard } from '~/components/app/integration-card'
import { Button } from '~/components/ui/button'
import { getIntegrations, saveIntegrations } from '~/services/api/dashboard'
import type { IntegrationService } from '~/types/domain'

export function IntegrationsPage() {
  const queryClient = useQueryClient()
  const integrationsQuery = useQuery({
    queryKey: ['integrations'],
    queryFn: getIntegrations,
  })

  const saveMutation = useMutation({
    mutationFn: saveIntegrations,
    onSuccess: () => {
      toast.success('Integracoes salvas')
      void queryClient.invalidateQueries({ queryKey: ['integrations'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const services = integrationsQuery.data || []

  return (
    <div className="space-y-6">
      <Button
        onClick={() =>
          saveMutation.mutate(
            services.map((service: IntegrationService) =>
              service.id === 'whatsapp' ? { ...service, enabled: !service.enabled, status: service.enabled ? 'disconnected' : 'connected' } : service,
            ),
          )
        }
      >
        Alternar WhatsApp Cloud API
      </Button>
      <div className="grid gap-6 lg:grid-cols-2">
        {services.map((service: IntegrationService) => (
          <IntegrationCard key={service.id} service={service} />
        ))}
      </div>
    </div>
  )
}
