<script setup lang="ts">
/**
 * Role management — UD-23.
 *
 * This screen grants and revokes console access. It is NOT account
 * management: there is no account listing, no search of the user base, no
 * suspension, and no deletion — all of those were struck from the spec on
 * 2026-08-21. The administrator must know the exact email of the person
 * they are granting access to.
 *
 * Left panel: email lookup → one-account result → Grant admin.
 *   For giving access to someone new.
 *
 * Right panel: current administrators → Withdraw admin.
 *   For seeing who has access and revoking it. This is NOT the account list
 *   struck on 2026-08-21 — it shows only the people who can sign into this
 *   console, which is a property of the console, not of the user base.
 */
import { computed, onMounted, ref } from 'vue'
import { KeyRound, Loader2, Search, ShieldCheck, ShieldMinus, Users } from 'lucide-vue-next'
import DataState from '@/components/Common/DataState.vue'
import PageHeader from '@/components/Common/PageHeader.vue'
import StatusBadge from '@/components/Common/StatusBadge.vue'
import ConfirmDialog from '@/components/Common/ConfirmDialog.vue'
import { ApiError } from '@/api/http'
import { assignUserRole, findUserByEmail, listAdmins } from '@/api/admin'
import { useToastStore } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'
import { shortId } from '@/utils/format'
import type { AccountLookup, UserRole } from '@/types/domain'

const toasts = useToastStore()
const auth = useAuthStore()

// ── Lookup ────────────────────────────────────────────────────────────────

const emailInput = ref('')
const lookupLoading = ref(false)
const lookupError = ref<string | null>(null)
/** The single account result, or null when nothing has been looked up yet. */
const account = ref<AccountLookup | null>(null)

async function lookup() {
  const email = emailInput.value.trim()
  if (!email) return
  lookupLoading.value = true
  lookupError.value = null
  account.value = null
  try {
    account.value = await findUserByEmail(email)
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 404) {
      lookupError.value = 'No account with that email address.'
    } else if (cause instanceof ApiError && cause.status === 400) {
      lookupError.value = cause.message
    } else {
      lookupError.value = cause instanceof Error ? cause.message : 'Lookup failed.'
    }
  } finally {
    lookupLoading.value = false
  }
}

// ── Admin list ────────────────────────────────────────────────────────────

const admins = ref<AccountLookup[]>([])
const adminsLoading = ref(true)
const adminsError = ref<string | null>(null)

let adminsLoadId = 0

async function loadAdmins() {
  const id = ++adminsLoadId
  adminsLoading.value = true
  adminsError.value = null
  try {
    const data = await listAdmins()
    if (id !== adminsLoadId) return
    admins.value = data
  } catch (cause) {
    if (id !== adminsLoadId) return
    adminsError.value = cause instanceof Error ? cause.message : 'Failed to load administrators.'
    admins.value = []
  } finally {
    if (id === adminsLoadId) adminsLoading.value = false
  }
}

onMounted(loadAdmins)

// ── Role assignment ───────────────────────────────────────────────────────

const confirmOpen = ref(false)
const pendingRole = ref<UserRole | null>(null)
/** The account that the pending role change targets — from either panel. */
const pendingAccount = ref<AccountLookup | null>(null)
const acting = ref(false)

/** True when the pending target is the operator themselves. */
const isPendingSelf = computed(() => pendingAccount.value?.id === auth.profile?.id)

function requestRoleChange(target: AccountLookup, role: UserRole) {
  pendingAccount.value = target
  pendingRole.value = role
  confirmOpen.value = true
}

async function confirmRoleChange() {
  if (!pendingAccount.value || !pendingRole.value) return
  acting.value = true
  try {
    const result = await assignUserRole(pendingAccount.value.id, pendingRole.value)
    confirmOpen.value = false

    if (!result.changed) {
      toasts.info(`${result.username} already holds the "${result.role_after}" role. Nothing changed.`)
      return
    }

    toasts.success(
      result.role_after === 'admin'
        ? `${result.username} is now an administrator.`
        : `Administrator access withdrawn from ${result.username}.`,
    )

    // Update the lookup card if it was the source of this action.
    if (account.value?.id === result.id) {
      account.value = { ...account.value, role: result.role_after }
    }

    // Refresh the admin list since the set changed.
    await loadAdmins()
  } catch (cause) {
    confirmOpen.value = false
    if (cause instanceof ApiError && cause.isConflict) {
      toasts.error(cause.message)
    } else {
      toasts.error(cause instanceof Error ? cause.message : 'Role change failed.')
    }
  } finally {
    acting.value = false
  }
}

const confirmTitle = computed(() =>
  pendingRole.value === 'admin' ? 'Grant administrator access' : 'Withdraw administrator access',
)
const confirmMessage = computed(() => {
  const name = pendingAccount.value?.username ?? 'this account'
  return pendingRole.value === 'admin'
    ? `${name} will be able to sign into this console and moderate content, settle bounties, and manage roles.`
    : `${name} will lose access to this console immediately. If they are signed in, their next request will end their session.`
})
const confirmLabel = computed(() =>
  pendingRole.value === 'admin' ? 'Grant admin' : 'Withdraw admin',
)
</script>

<template>
  <PageHeader
    title="Roles"
    subtitle="Grant and revoke administrator access to this console."
    requirement="SRS-93–98 · UD-23"
  />

  <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6 xl:flex-row">
    <!-- Lookup + grant panel -->
    <section class="flex min-w-0 flex-col rounded-2xl border border-stone-200 bg-white xl:w-[26rem]">
      <div class="border-b border-stone-200 p-4">
        <h2 class="text-sm font-semibold text-stone-900">Grant access</h2>
        <p class="mt-0.5 text-xs text-stone-500">
          Enter the exact email of the account to make an administrator.
        </p>
      </div>

      <form class="flex gap-2 border-b border-stone-200 p-4" @submit.prevent="lookup">
        <input
          v-model="emailInput"
          type="email"
          placeholder="user@example.com"
          class="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
          :disabled="lookupLoading"
        />
        <button
          type="submit"
          class="flex cursor-pointer items-center gap-2 rounded-lg bg-[#362621] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4A3731] disabled:opacity-60"
          :disabled="lookupLoading || !emailInput.trim()"
        >
          <Loader2 v-if="lookupLoading" :size="16" class="animate-spin" />
          <Search v-else :size="16" />
          Find
        </button>
      </form>

      <!-- Result -->
      <div class="flex flex-1 flex-col">
        <!-- Error / not found -->
        <div
          v-if="lookupError"
          class="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center"
        >
          <p class="text-sm text-stone-600">{{ lookupError }}</p>
        </div>

        <!-- Account card -->
        <div v-else-if="account" class="flex flex-1 flex-col p-4">
          <div class="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-base font-semibold text-stone-900">{{ account.username }}</p>
                <p class="mt-0.5 font-mono text-xs text-stone-500">{{ emailInput.trim() }}</p>
                <p class="mt-0.5 font-mono text-[11px] text-stone-400">{{ shortId(account.id) }}</p>
              </div>
              <StatusBadge :value="account.role" />
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <button
                v-if="account.role === 'user'"
                type="button"
                class="flex cursor-pointer items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
                :disabled="acting"
                @click="requestRoleChange(account, 'admin')"
              >
                <ShieldCheck :size="16" />
                Grant admin
              </button>

              <p
                v-if="account.role === 'admin'"
                class="text-xs text-stone-500"
              >
                Already an administrator. Use the panel on the right to withdraw access.
              </p>

              <Loader2 v-if="acting" :size="18" class="animate-spin self-center text-stone-400" />
            </div>
          </div>
        </div>

        <!-- Empty state — before any search -->
        <div
          v-else-if="!lookupLoading"
          class="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center"
        >
          <KeyRound :size="24" class="text-stone-300" />
          <p class="text-sm text-stone-500">Look up an account to grant access.</p>
        </div>
      </div>
    </section>

    <!-- Current administrators -->
    <section class="flex min-w-0 flex-1 flex-col rounded-2xl border border-stone-200 bg-white">
      <div class="flex items-center justify-between border-b border-stone-200 p-4">
        <div>
          <h2 class="text-sm font-semibold text-stone-900">Current administrators</h2>
          <p class="mt-0.5 text-xs text-stone-500">
            Everyone who can sign into this console.
          </p>
        </div>
        <span v-if="!adminsLoading && !adminsError" class="text-xs text-stone-400">
          {{ admins.length }} account{{ admins.length === 1 ? '' : 's' }}
        </span>
      </div>

      <DataState
        :loading="adminsLoading"
        :error="adminsError"
        :empty="admins.length === 0"
        empty-message="No administrators found."
        skeleton="list"
        :skeleton-rows="3"
        @retry="loadAdmins"
      >
        <ul class="min-h-0 flex-1 divide-y divide-stone-100 overflow-y-auto">
          <li
            v-for="admin in admins"
            :key="admin.id"
            class="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-stone-900">{{ admin.username }}</p>
              <p class="font-mono text-[11px] text-stone-400">{{ shortId(admin.id) }}</p>
              <p
                v-if="admin.id === auth.profile?.id"
                class="text-[11px] text-stone-500"
              >
                You
              </p>
            </div>

            <button
              v-if="admin.id !== auth.profile?.id"
              type="button"
              class="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-60"
              :disabled="acting"
              @click="requestRoleChange(admin, 'user')"
            >
              <ShieldMinus :size="14" />
              Withdraw
            </button>
          </li>
        </ul>
      </DataState>
    </section>
  </div>

  <ConfirmDialog
    :open="confirmOpen"
    :title="confirmTitle"
    :message="confirmMessage"
    :confirm-label="confirmLabel"
    :danger="pendingRole === 'user'"
    :busy="acting"
    @confirm="confirmRoleChange"
    @cancel="confirmOpen = false"
  />
</template>
