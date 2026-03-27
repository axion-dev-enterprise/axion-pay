import { Link } from 'react-router-dom'
import { CheckoutPreview } from '~/components/app/checkout-preview'
import { SectionHeading } from '~/components/shared/section-heading'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { demoCheckoutConfig, demoCheckoutProduct } from '~/mocks/fixtures'

export function CheckoutLandingPage() {
  return (
    <div className="section-space">
      <div className="page-wrap space-y-10">
        <SectionHeading
          eyebrow="Checkout PRO"
          title="Checkout personalizavel com linguagem visual premium e foco em conversao."
          description="Merchants conseguem controlar branding, metodos, textos e callback sem transformar o fluxo em um formulario genérico."
        />
        <CheckoutPreview config={demoCheckoutConfig} product={demoCheckoutProduct} />
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            ['Branding', 'Logo, nome da marca, cores e mensagem de rodape ajustaveis por merchant.'],
            ['Metodo de pagamento', 'PIX e cartao com estados claros de processamento, falha e confirmacao.'],
            ['Preview operacional', 'Painel permite validar a experiencia antes de publicar o link.'],
          ].map(([title, text]) => (
            <Card key={title}>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-mist">{text}</p>
            </Card>
          ))}
        </div>
        <Button asChild size="lg">
          <Link to="/register">Ativar Checkout PRO</Link>
        </Button>
      </div>
    </div>
  )
}

