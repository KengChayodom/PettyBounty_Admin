/**
 * Authentication against Supabase Auth (GoTrue), spoken over plain `fetch`.
 *
 * Authentication is the one Supabase service a client is allowed to call
 * directly (`CLAUDE.md`, golden rule) — the same exemption the Flutter app
 * uses. Everything the session is then spent on goes through FastAPI, which
 * re-verifies the token and looks up `users.role` server-side; nothing here is
 * trusted by the backend.
 *
 * GoTrue's REST surface is three POSTs, so its SDK would earn nothing but a
 * dependency. The role check is deliberately NOT read from the JWT claims: the
 * authority on who is an administrator is `require_admin`, and the console asks
 * it the same question through GET /auth/me rather than decoding the token.
 */
import { request } from './http'
import type { UserProfile } from '@/types/domain'

const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export interface Session {
  access_token: string
  refresh_token: string
  /** Absolute expiry, seconds since the epoch (GoTrue sends this directly). */
  expires_at: number
}

export class AuthError extends Error {}

async function gotrue(path: string, body: unknown, accessToken?: string): Promise<unknown> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new AuthError(
      'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — copy .env.example to .env.local.',
    )
  }
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  }
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  let response: Response
  try {
    response = await fetch(`${SUPABASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
  } catch {
    throw new AuthError('Cannot reach Supabase Auth. Check your connection.')
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      (payload as { error_description?: string; msg?: string; message?: string })
        ?.error_description ??
      (payload as { msg?: string })?.msg ??
      (payload as { message?: string })?.message ??
      `Sign-in failed (${response.status})`
    throw new AuthError(message)
  }
  return payload
}

function toSession(payload: unknown): Session {
  const raw = payload as {
    access_token?: string
    refresh_token?: string
    expires_at?: number
    expires_in?: number
  }
  if (!raw?.access_token || !raw.refresh_token) {
    throw new AuthError('Supabase returned no session — is email confirmation still pending?')
  }
  return {
    access_token: raw.access_token,
    refresh_token: raw.refresh_token,
    expires_at: raw.expires_at ?? Math.floor(Date.now() / 1000) + (raw.expires_in ?? 3600),
  }
}

export async function signIn(email: string, password: string): Promise<Session> {
  return toSession(await gotrue('/auth/v1/token?grant_type=password', { email, password }))
}

export async function refreshSession(refreshToken: string): Promise<Session> {
  return toSession(
    await gotrue('/auth/v1/token?grant_type=refresh_token', { refresh_token: refreshToken }),
  )
}

/**
 * Best-effort revocation. A failure here is not worth blocking on: the local
 * session is dropped either way, and an access token expires on its own.
 */
export async function signOut(accessToken: string): Promise<void> {
  try {
    await gotrue('/auth/v1/logout', {}, accessToken)
  } catch {
    /* ignored on purpose — see above */
  }
}

/** The server-authoritative profile, `role` included. */
export function fetchProfile(): Promise<UserProfile> {
  return request<UserProfile>('/auth/me')
}
