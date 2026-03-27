import { request } from '~/services/http/client'
import { mapApiKey, mapUser } from '~/services/adapters/backend'

export async function login(payload: { identifier: string; password: string }) {
  const data = await request<any>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return {
    user: mapUser(data.user),
    apiKeys: [],
  }
}

export async function register(payload: {
  name: string
  cpf: string
  whatsapp: string
  password: string
}) {
  const data = await request<any>('/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return {
    user: mapUser(data.user),
    apiKeys: data.api_key ? [mapApiKey({ label: 'sandbox', key: data.api_key }, data.api_key)] : [],
  }
}

export async function getMe() {
  const data = await request<any>('/account/me')
  return {
    user: mapUser(data.user),
    apiKeys: Array.isArray(data.api_keys) ? data.api_keys.map((item: any) => mapApiKey(item)) : [],
  }
}

export async function logout() {
  return request('/auth/logout', { method: 'POST' })
}

export async function createApiKey(label: string) {
  const data = await request<any>('/account/api-keys', {
    method: 'POST',
    body: JSON.stringify({ label }),
  })
  return mapApiKey(data.api_key_meta, data.api_key)
}

export async function revokeApiKey(id: string) {
  return request(`/account/api-keys/${id}`, { method: 'DELETE' })
}

