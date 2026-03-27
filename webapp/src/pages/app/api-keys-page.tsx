import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { createApiKey, getMe, revokeApiKey } from '~/services/api/auth'
import { useSessionStore } from '~/store/session-store'
import type { ApiKeyRecord } from '~/types/domain'
import { maskSecret } from '~/utils/formatters'

export function ApiKeysPage() {
  const queryClient = useQueryClient()
  const setApiKeys = useSessionStore((state) => state.setApiKeys)
  const setActiveApiKeyId = useSessionStore((state) => state.setActiveApiKeyId)

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  })

  useEffect(() => {
    if (meQuery.data?.apiKeys) {
      setApiKeys(meQuery.data.apiKeys)
    }
  }, [meQuery.data, setApiKeys])

  const createMutation = useMutation({
    mutationFn: createApiKey,
    onSuccess: async (apiKey) => {
      toast.success('API key criada')
      setActiveApiKeyId(apiKey.id)
      const fresh = await getMe()
      setApiKeys([apiKey, ...fresh.apiKeys])
      void queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const revokeMutation = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: async () => {
      toast.success('API key revogada')
      const fresh = await getMe()
      setApiKeys(fresh.apiKeys)
      void queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 md:flex-row">
          <Input placeholder="Nome da nova chave" id="new-api-key-label" />
          <Button onClick={() => createMutation.mutate((document.getElementById('new-api-key-label') as HTMLInputElement).value || 'merchant')}>
            Gerar nova chave
          </Button>
        </div>
      </Card>

      <div className="grid gap-4">
        {meQuery.data?.apiKeys.map((apiKey: ApiKeyRecord) => (
          <Card key={apiKey.id}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{apiKey.label}</h3>
                <div className="mt-2 font-mono text-sm text-mist">{maskSecret(apiKey.maskedKey || apiKey.key || '')}</div>
              </div>
              <Button variant="danger" onClick={() => revokeMutation.mutate(apiKey.id)}>
                Revogar
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
