export interface ApiEnvelope<T> {
  ok: boolean
  error?: string
  code?: string
  requestId?: string
  [key: string]: unknown
}

