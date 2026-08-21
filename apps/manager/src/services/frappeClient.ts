export interface FrappeEnvelope<T> {
  message: T
  exc?: string
  exception?: string
}

export class FrappeRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'FrappeRequestError'
  }
}

let csrfToken = ''

export function setFrappeCsrfToken(token?: string | null): void {
  csrfToken = token?.trim() ?? ''
}

function rpcUrl(method: string): URL {
  return new URL(`/api/method/${method}`, window.location.origin)
}

function errorMessage(payload: Partial<FrappeEnvelope<unknown>>): string {
  return typeof payload.message === 'string'
    ? payload.message
    : payload.exception || 'Серверийн хүсэлт амжилтгүй боллоо.'
}

export async function callFrappe<T>(
  method: string,
  args: Record<string, unknown> = {},
  httpMethod: 'GET' | 'POST' = 'GET',
  requestOptions: { signal?: AbortSignal } = {},
): Promise<T> {
  const url = rpcUrl(method)
  const options: RequestInit = {
    method: httpMethod,
    credentials: 'include',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal: requestOptions.signal,
  }
  if (httpMethod === 'GET') {
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
    }
  } else {
    const body = new URLSearchParams()
    for (const [key, value] of Object.entries(args)) {
      if (value === undefined || value === null) continue
      body.set(key, typeof value === 'string' ? value : JSON.stringify(value))
    }
    options.headers = {
      ...options.headers,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(csrfToken ? { 'X-Frappe-CSRF-Token': csrfToken } : {}),
    }
    options.body = body
  }
  const response = await fetch(url, options)
  const payload = await response.json().catch(() => ({})) as Partial<FrappeEnvelope<T>>
  if (!response.ok || payload.exc || payload.exception) {
    throw new FrappeRequestError(errorMessage(payload), response.status)
  }
  return payload.message as T
}

export function idempotencyKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}
