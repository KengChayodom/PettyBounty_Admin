/**
 * The administrator's session.
 *
 * Two facts make a session usable, and both are checked: a Supabase token that
 * GoTrue accepts, and `users.role === 'admin'` as read back from FastAPI. The
 * second is the one that matters — every admin route re-checks it server-side
 * in `require_admin`, so a console that skipped it would merely be lying to its
 * operator about what they can do.
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { AuthError, fetchProfile, refreshSession, signIn, signOut, type Session } from '@/api/auth'
import { ApiError, setAuthFailureHandler, setBearerToken } from '@/api/http'
import type { UserProfile } from '@/types/domain'

const STORAGE_KEY = 'pb_admin_session'
/** Refresh this many seconds before expiry rather than after a 401. */
const REFRESH_MARGIN_SECONDS = 60

function readStored(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(readStored())
  const profile = ref<UserProfile | null>(null)
  /** False until `restore()` has settled, so the guard never redirects early. */
  const ready = ref(false)

  const isAuthenticated = computed(() => session.value !== null && profile.value?.role === 'admin')

  function persist(next: Session | null) {
    session.value = next
    setBearerToken(next?.access_token ?? null)
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* private browsing — the session simply won't survive a reload */
    }
  }

  function clear() {
    persist(null)
    profile.value = null
  }

  /** Swap an expiring access token for a fresh one; drops the session if refused. */
  async function ensureFreshToken(): Promise<boolean> {
    const current = session.value
    if (!current) return false
    if (current.expires_at - REFRESH_MARGIN_SECONDS > Date.now() / 1000) return true
    try {
      persist(await refreshSession(current.refresh_token))
      return true
    } catch {
      clear()
      return false
    }
  }

  /**
   * Sign in, then prove the account is an administrator before treating the
   * session as usable. A non-admin's token is discarded on the spot — leaving
   * it in place would let the console render screens whose every request 403s.
   */
  async function login(email: string, password: string): Promise<void> {
    persist(await signIn(email, password))
    try {
      profile.value = await fetchProfile()
    } catch (error) {
      clear()
      if (error instanceof ApiError && error.status === 404) {
        throw new AuthError('This account has no profile row in `users`.')
      }
      throw error
    }
    if (profile.value.role !== 'admin') {
      clear()
      throw new AuthError('Access denied: admin privileges required.')
    }
  }

  async function logout(): Promise<void> {
    const token = session.value?.access_token
    clear()
    if (token) await signOut(token)
  }

  /** Rehydrate on boot: refresh if needed, then re-read the role from the server. */
  async function restore(): Promise<void> {
    setBearerToken(session.value?.access_token ?? null)
    if (session.value && (await ensureFreshToken())) {
      try {
        const me = await fetchProfile()
        if (me.role === 'admin') profile.value = me
        else clear()
      } catch {
        clear()
      }
    }
    ready.value = true
  }

  // A 401/403 from any route means this session is finished — including the
  // case where an administrator's role was revoked mid-visit.
  setAuthFailureHandler(clear)

  return { session, profile, ready, isAuthenticated, login, logout, restore, ensureFreshToken }
})
