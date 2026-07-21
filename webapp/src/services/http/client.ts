export class HttpError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function parseJson<T>(response: Response): Promise<T | null> {
  const text = await response.text()
  if (!text) return null
  return JSON.parse(text) as T
}

export async function request<T>(path: string, init?: RequestInit) {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const url = baseUrl ? `${baseUrl}${path}` : path;
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  const data = await parseJson<Record<string, unknown>>(response)
  if (!response.ok) {
    throw new HttpError(
      String(data?.error || data?.message || 'Erro de requisicao'),
      response.status,
      data?.code ? String(data.code) : undefined,
    )
  }

  return data as T
}

