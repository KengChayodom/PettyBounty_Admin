<script setup lang="ts">
/**
 * Sign-in. Credentials go to Supabase Auth; the admin role comes back from
 * FastAPI (see `stores/auth`). A non-admin account authenticates successfully
 * and is still refused here, with UD-13/UD-14's wording: admin privileges
 * required.
 */
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Loader2, LockKeyhole } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const busy = ref(false)

async function submit() {
  busy.value = true
  error.value = null
  try {
    await auth.login(email.value.trim(), password.value)
    const next = typeof route.query.next === 'string' ? route.query.next : '/'
    await router.replace(next)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Sign-in failed.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-[#362621] p-4">
    <div class="w-full max-w-sm">
      <div class="mb-8 flex flex-col items-center gap-3 text-center">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/20 font-bold text-orange-400"
        >
          PB
        </div>
        <div>
          <h1 class="text-lg font-bold text-white">Petty Bounty</h1>
          <p class="text-[11px] tracking-widest text-gray-400 uppercase">Admin console</p>
        </div>
      </div>

      <form class="rounded-2xl bg-white p-6 shadow-xl" @submit.prevent="submit">
        <label class="block text-sm font-medium text-stone-700" for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          autocomplete="username"
          class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
        />

        <label class="mt-4 block text-sm font-medium text-stone-700" for="password">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
        />

        <p
          v-if="error"
          role="alert"
          class="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {{ error }}
        </p>

        <button
          type="submit"
          class="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#362621] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4A3731] disabled:opacity-60"
          :disabled="busy"
        >
          <Loader2 v-if="busy" :size="16" class="animate-spin" />
          <LockKeyhole v-else :size="16" />
          {{ busy ? 'Signing in…' : 'Sign in' }}
        </button>

        <p class="mt-4 text-center text-xs text-stone-400">
          Administrator accounts only — <code>users.role</code> is checked server-side.
        </p>
      </form>
    </div>
  </div>
</template>
