import { request } from '~/services/http/client'
import {
  mapCheckoutProduct,
  mapCheckoutProConfig,
  mapClient,
  mapIntegration,
  mapOverview,
  mapTransaction,
} from '~/services/adapters/backend'
import type { CheckoutProduct, CheckoutProConfig, IntegrationService } from '~/types/domain'

export async function getOverview() {
  const data = await request<any>('/api/dashboard/overview')
  return {
    overview: mapOverview(data.overview, data.recentTransactions),
    recentTransactions: Array.isArray(data.recentTransactions)
      ? data.recentTransactions.map(mapTransaction)
      : [],
  }
}

export async function getClients() {
  const data = await request<any>('/api/dashboard/clients')
  return Array.isArray(data.clients) ? data.clients.map(mapClient) : []
}

export async function getIntegrations() {
  const data = await request<any>('/api/dashboard/integrations')
  return Array.isArray(data.integrations?.services)
    ? data.integrations.services.map(mapIntegration)
    : []
}

export async function saveIntegrations(services: IntegrationService[]) {
  const data = await request<any>('/api/dashboard/integrations', {
    method: 'PUT',
    body: JSON.stringify({ services }),
  })
  return Array.isArray(data.integrations?.services)
    ? data.integrations.services.map(mapIntegration)
    : []
}

export async function getCheckoutProConfig() {
  const data = await request<any>('/api/dashboard/checkout-pro')
  return mapCheckoutProConfig(data.config)
}

export async function saveCheckoutProConfig(payload: CheckoutProConfig) {
  const data = await request<any>('/api/dashboard/checkout-pro', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  return mapCheckoutProConfig(data.config)
}

export async function getCheckoutProducts() {
  const data = await request<any>('/api/dashboard/products')
  return Array.isArray(data.products) ? data.products.map(mapCheckoutProduct) : []
}

export async function getPayTags() {
  const data = await request<any>('/api/dashboard/pay-tags')
  return Array.isArray(data.pay_tags) ? data.pay_tags : []
}

export async function createPayTag(payload: {
  name: string
  description?: string
  webhookUrl?: string
}) {
  const data = await request<any>('/api/dashboard/pay-tags', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.pay_tag
}

export async function createCheckoutProduct(payload: Partial<CheckoutProduct>) {
  const data = await request<any>('/api/dashboard/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return mapCheckoutProduct(data.product)
}

export async function updateCheckoutProduct(id: string, payload: Partial<CheckoutProduct>) {
  const data = await request<any>(`/api/dashboard/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return mapCheckoutProduct(data.product)
}

export async function deleteCheckoutProduct(id: string) {
  return request(`/api/dashboard/products/${id}`, { method: 'DELETE' })
}
