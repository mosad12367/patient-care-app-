import { supabase } from './supabase'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'

export class UnauthorizedError extends Error {
  constructor() {
    super('Not authenticated')
    this.name = 'UnauthorizedError'
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new UnauthorizedError()
  return { Authorization: `Bearer ${session.access_token}` }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  requiresAuth = true
): Promise<T> {
  let headers: Record<string, string> = {}
  if (requiresAuth) {
    headers = await getAuthHeaders()
  } else {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) headers = { Authorization: `Bearer ${session.access_token}` }
  }
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(error.error ?? 'Request failed')
  }

  return response.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
  postPublic: <T>(path: string, body: unknown) => request<T>('POST', path, body, false),
}
