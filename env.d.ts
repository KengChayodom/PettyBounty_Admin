/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** FastAPI gateway. Defaults to http://127.0.0.1:8000 when unset. */
  readonly VITE_API_BASE_URL?: string
  /** Supabase project URL — used for authentication ONLY (see api/auth.ts). */
  readonly VITE_SUPABASE_URL?: string
  /** Publishable anon key; designed to ship in a client. */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
