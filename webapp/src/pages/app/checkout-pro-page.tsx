import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { CheckoutPreview } from '~/components/app/checkout-preview'
import { EmptyState } from '~/components/shared/empty-state'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { demoCheckoutProduct } from '~/mocks/fixtures'
import {
  createPayTag,
  createCheckoutProduct,
  getCheckoutProducts,
  getPayTags,
  getCheckoutProConfig,
  saveCheckoutProConfig,
} from '~/services/api/dashboard'
import type { CheckoutProduct } from '~/types/domain'

export function CheckoutProPage() {
  const queryClient = useQueryClient()
  const [draftSlug, setDraftSlug] = useState('produto-demo')
  const [draftTitle, setDraftTitle] = useState('Produto demo')

  const configQuery = useQuery({ queryKey: ['checkout-pro-config'], queryFn: getCheckoutProConfig })
  const productsQuery = useQuery({ queryKey: ['checkout-products'], queryFn: getCheckoutProducts })
  const payTagsQuery = useQuery({ queryKey: ['pay-tags'], queryFn: getPayTags })

  const saveConfigMutation = useMutation({
    mutationFn: saveCheckoutProConfig,
    onSuccess: () => {
      toast.success('Configuracao salva')
      void queryClient.invalidateQueries({ queryKey: ['checkout-pro-config'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const createProductMutation = useMutation({
    mutationFn: createCheckoutProduct,
    onSuccess: () => {
      toast.success('Checkout criado')
      void queryClient.invalidateQueries({ queryKey: ['checkout-products'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const config = configQuery.data

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <h2 className="text-xl font-semibold text-white">Branding do checkout</h2>
          {config ? (
            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-mist">Nome da marca</label>
                <Input defaultValue={config.brandName} id="brand-name" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-mist">Hero title</label>
                <Input defaultValue={config.heroTitle} id="hero-title" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-mist">Hero subtitle</label>
                <Input defaultValue={config.heroSubtitle} id="hero-subtitle" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-mist">Cor primaria</label>
                  <Input defaultValue={config.primaryColor} id="primary-color" />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-mist">Cor de destaque</label>
                  <Input defaultValue={config.accentColor} id="accent-color" />
                </div>
              </div>
              <Button
                onClick={() =>
                  saveConfigMutation.mutate({
                    ...config,
                    brandName: (document.getElementById('brand-name') as HTMLInputElement).value,
                    heroTitle: (document.getElementById('hero-title') as HTMLInputElement).value,
                    heroSubtitle: (document.getElementById('hero-subtitle') as HTMLInputElement).value,
                    primaryColor: (document.getElementById('primary-color') as HTMLInputElement).value,
                    accentColor: (document.getElementById('accent-color') as HTMLInputElement).value,
                  })
                }
              >
                Salvar configuracao
              </Button>
            </div>
          ) : null}
        </Card>

        {config ? <CheckoutPreview config={config} product={productsQuery.data?.[0] || demoCheckoutProduct} /> : null}
      </div>

      <Card>
        <h2 className="text-xl font-semibold text-white">Checkouts publicados</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <Input value={draftSlug} onChange={(event) => setDraftSlug(event.target.value)} placeholder="slug" />
          <Input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="titulo" />
          <Button
            onClick={async () => {
              let payTagId = payTagsQuery.data?.[0]?.id
              if (!payTagId) {
                const payTag = await createPayTag({
                  name: `merchant-${Date.now()}`,
                  description: 'Pay-tag criada automaticamente para checkout demo',
                })
                payTagId = payTag.id
                await queryClient.invalidateQueries({ queryKey: ['pay-tags'] })
              }

              createProductMutation.mutate({
                slug: draftSlug,
                title: draftTitle,
                description: 'Checkout premium do merchant',
                price: 149.9,
                currency: 'BRL',
                payTagId,
              })
            }}
          >
            Criar checkout
          </Button>
        </div>

        <div className="mt-6 grid gap-4">
          {productsQuery.data?.length ? (
            productsQuery.data.map((item: CheckoutProduct) => (
              <Card key={item.id} className="bg-white/[0.03]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-white">{item.title}</div>
                    <div className="mt-2 text-sm text-mist">/{item.slug}</div>
                  </div>
                  <Button asChild variant="secondary">
                    <a href={`/checkout/${item.slug}`}>Abrir</a>
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <EmptyState
              title="Nenhum checkout publicado"
              description="Crie um produto para expor uma rota publica de pagamento."
            />
          )}
        </div>
      </Card>
    </div>
  )
}
