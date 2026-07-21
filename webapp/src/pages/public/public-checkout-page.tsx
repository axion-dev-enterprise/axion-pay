import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckoutPreview } from '~/components/app/checkout-preview'
import { EmptyState } from '~/components/shared/empty-state'
import { ErrorState } from '~/components/shared/error-state'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { demoCheckoutConfig, demoCheckoutProduct } from '~/mocks/fixtures'
import { createPublicCheckoutPayment, getPublicCheckoutProduct } from '~/services/api/checkout'
import { formatCurrency } from '~/utils/formatters'

const schema = z.object({
  name: z.string().min(2, 'Informe o nome'),
  email: z.string().email('Informe um email valido'),
})

type FormValues = z.infer<typeof schema>

export function PublicCheckoutPage() {
  const { slug } = useParams<{ slug: string }>()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
    },
  })

  const productQuery = useQuery({
    queryKey: ['public-checkout', slug],
    queryFn: () => getPublicCheckoutProduct(slug || ''),
    enabled: Boolean(slug),
    retry: false,
  })

  const checkoutMutation = useMutation({
    mutationFn: ({ method, values }: { method: 'pix' | 'card'; values: FormValues }) =>
      createPublicCheckoutPayment(slug || '', method, {
        customer: { name: values.name, email: values.email },
      }),
    onSuccess: (result) => {
      toast.success(`Pagamento ${result.transaction.status}`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const product = productQuery.data || demoCheckoutProduct

  async function handlePay(method: 'pix' | 'card') {
    const valid = await form.trigger()
    if (!valid) return
    checkoutMutation.mutate({ method, values: form.getValues() })
  }

  return (
    <div className="section-space">
      <div className="page-wrap grid gap-8 lg:grid-cols-[1fr_420px]">
        <div className="space-y-8">
          <CheckoutPreview config={demoCheckoutConfig} product={product} />
          {productQuery.isError ? (
            <ErrorState message="Nao foi possivel carregar o checkout solicitado no backend atual." />
          ) : null}
          {checkoutMutation.data ? (
            <Card>
              <h3 className="text-lg font-semibold text-white">Status do pagamento</h3>
              <div className="mt-4 text-sm text-mist">
                Transacao {checkoutMutation.data.transaction.id} em {checkoutMutation.data.transaction.status}.
              </div>
              {checkoutMutation.data.pixPayload ? (
                <pre className="mt-4 overflow-x-auto rounded-3xl bg-[#03100c] p-4 font-mono text-xs text-neon-200">
                  <code>{checkoutMutation.data.pixPayload}</code>
                </pre>
              ) : null}
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="text-2xl font-semibold text-white">Finalizar compra</h2>
            <p className="mt-2 text-sm text-mist">
              {product.title} • {formatCurrency(product.price, product.currency)}
            </p>
            <form className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-mist">Nome</label>
                <Input {...form.register('name')} />
                <p className="mt-1 text-xs text-alert-danger">{form.formState.errors.name?.message}</p>
              </div>
              <div>
                <label className="mb-2 block text-sm text-mist">Email</label>
                <Input {...form.register('email')} />
                <p className="mt-1 text-xs text-alert-danger">{form.formState.errors.email?.message}</p>
              </div>
            </form>
            <div className="mt-6 space-y-3">
              <Button className="w-full" onClick={() => void handlePay('pix')} disabled={checkoutMutation.isPending}>
                Pagar com PIX
              </Button>
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => void handlePay('card')}
                disabled={checkoutMutation.isPending}
              >
                Pagar com cartao
              </Button>
            </div>
          </Card>

          {!slug ? (
            <EmptyState
              title="Slug nao informado"
              description="Use uma rota como /checkout/plano-scale para carregar um checkout real."
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

