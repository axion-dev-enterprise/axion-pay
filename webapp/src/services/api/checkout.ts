import { mapCheckoutProduct, mapTransaction } from '~/services/adapters/backend'
import { request } from '~/services/http/client'

export async function getPublicCheckoutProduct(slug: string) {
  const data = await request<any>(`/checkout/products/${slug}`)
  return mapCheckoutProduct(data.product)
}

export async function createPublicCheckoutPayment(
  slug: string,
  method: 'pix' | 'card',
  payload: Record<string, unknown>,
) {
  const data = await request<any>(`/checkout/products/${slug}/payments/${method}`, {
    method: 'POST',
    headers: {
      'Idempotency-Key': `checkout-${slug}-${method}-${Date.now()}`,
    },
    body: JSON.stringify(payload),
  })

  return {
    transaction: mapTransaction(data.transaction),
    pixPayload: data.pix_payload,
    pixQrCodeBase64: data.pix_qr_code_base64,
    pixTicketUrl: data.pix_ticket_url,
    pixExpiresAt: data.pix_expires_at,
  }
}

