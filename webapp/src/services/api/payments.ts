import { mapPaymentEvents, mapTransaction } from '~/services/adapters/backend'
import { request } from '~/services/http/client'

function headers(apiKey: string) {
  return { 'x-api-key': apiKey }
}

export async function getPaymentStats(apiKey: string) {
  return request<any>('/payments/stats', { headers: headers(apiKey) })
}

export async function getPayments(apiKey: string, query = '') {
  const data = await request<any>(`/payments${query ? `?${query}` : ''}`, {
    headers: headers(apiKey),
  })
  const rows = Array.isArray(data.transactions)
    ? data.transactions
    : Array.isArray(data.items)
    ? data.items
    : []

  return {
    items: rows.map(mapTransaction),
    total: Number(data.total ?? rows.length),
    limit: Number(data.limit ?? rows.length),
    offset: Number(data.offset ?? 0),
  }
}

export async function getPaymentEvents(apiKey: string, id: string) {
  const data = await request<any>(`/payments/${id}/events`, { headers: headers(apiKey) })
  return mapPaymentEvents(Array.isArray(data.events) ? data.events : [])
}

