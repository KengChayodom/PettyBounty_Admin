/**
 * The single door to FastAPI.
 *
 * Every backend call in this app goes through `request`, for the same reason
 * the Flutter client has one: the golden rule (`CLAUDE.md`) is that only the
 * backend touches the database. The admin console talks to Supabase for
 * authentication ONLY (see `api/auth.ts`) and to FastAPI for everything else —
 * there is deliberately no supabase-js dependency here to reach for.
 */

/** Every FastAPI route wraps its payload in this envelope (`schemas/common`). */
interface StandardResponse<T> {
  status: string
  message: string
  data: T
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  /** 409 — another admin already decided this flag (UD-16 [E1]). */
  get isConflict() {
    return this.status === 409
  }

  /** 401/403 — the session died, or the account is not an administrator. */
  get isAuthFailure() {
    return this.status === 401 || this.status === 403
  }
}

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

/** Set by the auth store; read on every request so a logout takes effect at once. */
let bearerToken: string | null = null
/** Called on any 401/403 so the store can end the session without a circular import. */
let onAuthFailure: (() => void) | null = null

export function setBearerToken(token: string | null) {
  bearerToken = token
}

export function setAuthFailureHandler(handler: () => void) {
  onAuthFailure = handler
}

/**
 * FastAPI reports its own failures as `{"detail": ...}`, where the detail is a
 * string for a raised HTTPException and a list of field errors for a 422. Both
 * are flattened to one line here so callers never have to branch on the shape.
 */
async function errorMessage(response: Response): Promise<string> {
  let body: unknown
  try {
    body = await response.json()
  } catch {
    return response.statusText || `Request failed (${response.status})`
  }
  const detail = (body as { detail?: unknown })?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const e = item as { loc?: unknown[]; msg?: string }
        const field = Array.isArray(e.loc) ? e.loc.slice(1).join('.') : ''
        return field ? `${field}: ${e.msg}` : (e.msg ?? '')
      })
      .filter(Boolean)
      .join('; ')
  }
  return response.statusText || `Request failed (${response.status})`
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | boolean | null | undefined>
  /** Skip the bearer header — only the login call needs this. */
  anonymous?: boolean
}

/**
 * Perform one call and return the `data` field of its envelope.
 *
 * Throws `ApiError` for any non-2xx. A 401/403 additionally trips the auth
 * failure handler, because a token that stopped working cannot be recovered by
 * retrying — the session has to end and the operator has to log in again.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(path, API_BASE_URL)
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }

  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (!options.anonymous && bearerToken) headers['Authorization'] = `Bearer ${bearerToken}`

  let response: Response
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch (cause) {
    // fetch only rejects for transport failures — the server being down, CORS,
    // DNS. UD-13 [E1] / UD-14 [E1] both want this said plainly.
    throw new ApiError(0, `Cannot reach the backend at ${API_BASE_URL}. Is uvicorn running?`)
  }

  if (!response.ok) {
    const error = new ApiError(response.status, await errorMessage(response))
    if (error.isAuthFailure) onAuthFailure?.()
    throw error
  }

  if (response.status === 204) return undefined as T

  const payload = (await response.json()) as StandardResponse<T> | T
  // Most routes return the envelope. GET /sightings/{id}/matches was the
  // exception until 2026-09-09 and now sends it too; GET
  // /admin/missing-pets/{id} still answers with the bare report, so the
  // fallback below stays.
  if (payload && typeof payload === 'object' && 'data' in payload && 'status' in payload) {
    return (payload as StandardResponse<T>).data
  }
  return payload as T
}
