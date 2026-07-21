import { useQuery } from '@tanstack/react-query'
import { CheckoutPreview } from '~/components/app/checkout-preview'
import { demoCheckoutConfig, demoCheckoutProduct } from '~/mocks/fixtures'
import { getCheckoutProducts, getCheckoutProConfig } from '~/services/api/dashboard'

export function CheckoutProPreviewPage() {
  const configQuery = useQuery({ queryKey: ['checkout-pro-config'], queryFn: getCheckoutProConfig })
  const productsQuery = useQuery({ queryKey: ['checkout-products'], queryFn: getCheckoutProducts })

  return (
    <CheckoutPreview
      config={configQuery.data || demoCheckoutConfig}
      product={productsQuery.data?.[0] || demoCheckoutProduct}
    />
  )
}

