import type { CheckoutProduct, CheckoutProConfig } from '~/types/domain'
import { Card } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { formatCurrency } from '~/utils/formatters'

export function CheckoutPreview({
  config,
  product,
}: {
  config: CheckoutProConfig
  product: CheckoutProduct
}) {
  return (
    <div
      className="rounded-[2rem] border border-white/10 p-5 shadow-glow-lg"
      style={{
        background: `linear-gradient(180deg, ${config.primaryColor}22, rgba(4,17,13,0.96))`,
      }}
    >
      <Card className="overflow-hidden border-white/10 bg-[#071813]/90 p-0">
        <div className="border-b border-white/5 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-mist">{config.brandName}</div>
              <h3 className="mt-2 text-2xl font-semibold text-white">{config.heroTitle}</h3>
            </div>
            <Badge className="text-neon-300">Checkout PRO</Badge>
          </div>
          <p className="mt-3 text-sm leading-7 text-mist">{config.heroSubtitle}</p>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm text-mist">Pedido</div>
              <div className="mt-2 text-xl font-semibold text-white">{product.title}</div>
              <div className="mt-2 text-sm leading-7 text-mist">{product.description}</div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-neon-500/25 bg-neon-500/10 p-5">
                <div className="text-sm font-semibold text-white">PIX</div>
                <div className="mt-2 text-sm text-mist">Aprovacao imediata e QR com expiracao configuravel.</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm font-semibold text-white">Cartao</div>
                <div className="mt-2 text-sm text-mist">Fluxo otimizado para captura e status claros.</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-mist">Resumo</div>
            <div className="mt-3 text-3xl font-semibold text-white">
              {formatCurrency(product.price, product.currency)}
            </div>
            <div className="mt-2 text-sm text-mist">{config.testimonialText}</div>
            <div className="mt-6 space-y-3">
              <Button className="w-full">Pagar com PIX</Button>
              <Button variant="secondary" className="w-full">
                Pagar com cartao
              </Button>
            </div>
            <div className="mt-6 text-xs leading-6 text-mist">{config.footerMessage}</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
