<script setup lang="ts">
/**
 * Bounty rulings — the administrator's queue for Feature 6.
 *
 * The owner pays the returning hunter directly by PromptPay and submits the
 * slip; the hunter confirms or disputes it. Only what the two could not settle
 * reaches this screen (SRS-114): a disputed payment, a payment the hunter left
 * unconfirmed past its three-day dispute window, a report the hunter referred
 * as unpaid, or a rejected payment the owner has not replaced in three days.
 *
 * A case with a payment is confirmed or rejected (SRS-116). A case without one
 * can only be closed as unpaid (SRS-117). The backend records who ruled and
 * when (SRS-119).
 */
import { computed, onMounted, ref } from 'vue'
import { BadgeCheck, Ban, ExternalLink, Loader2, XCircle } from 'lucide-vue-next'
import ConfirmDialog from '@/components/Common/ConfirmDialog.vue'
import DataState from '@/components/Common/DataState.vue'
import PageHeader from '@/components/Common/PageHeader.vue'
import {
  closeBountyUnpaid,
  listBountyQueue,
  ruleBountyPayment,
  type BountyQueueEntry,
  type BountyQueueKind,
} from '@/api/admin'
import { useToastStore } from '@/stores/toast'
import { formatBounty, formatDateTime, shortId } from '@/utils/format'

type Action = 'confirm' | 'reject' | 'close'

const KIND_LABEL: Record<BountyQueueKind, string> = {
  disputed: 'Disputed by hunter',
  unconfirmed: 'Not confirmed in 3 days',
  unpaid: 'Reported unpaid',
  rejected_unpaid: 'Rejected, not paid again',
}

const KIND_STYLE: Record<BountyQueueKind, string> = {
  disputed: 'bg-rose-100 text-rose-700',
  unconfirmed: 'bg-amber-100 text-amber-800',
  unpaid: 'bg-rose-100 text-rose-700',
  rejected_unpaid: 'bg-stone-200 text-stone-700',
}

const toasts = useToastStore()

const entries = ref<BountyQueueEntry[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const selectedKey = ref<string | null>(null)
const pendingAction = ref<Action | null>(null)
const busy = ref(false)

/** Payment cases and unpaid cases share a pet id space, so key on both. */
function keyOf(e: BountyQueueEntry) {
  return `${e.kind}:${e.payment_id ?? e.pet_id}`
}

const selected = computed(() => entries.value.find((e) => keyOf(e) === selectedKey.value) ?? null)
/** A rejected_unpaid row still carries the slip of the payment that was rejected. */
const isRejectedSlip = computed(() => selected.value?.kind === 'rejected_unpaid')
const hasPayment = computed(() => Boolean(selected.value?.payment_id))

const dialog = computed(() => {
  const name = selected.value?.pet_name ?? ''
  switch (pendingAction.value) {
    case 'confirm':
      return {
        title: 'Confirm this payment?',
        message: `"${name}" becomes Resolved and the hunter is recorded as paid. Only confirm once you are satisfied the money arrived.`,
        label: 'Confirm payment',
        danger: false,
      }
    case 'reject':
      return {
        title: 'Reject this payment?',
        message: `The report stays Found and the owner is notified to pay "${name}"'s bounty again.`,
        label: 'Reject payment',
        danger: true,
      }
    case 'close':
      return {
        title: 'Close as unpaid?',
        message: `"${name}" becomes Resolved and is recorded as a bounty that was not paid. This cannot be undone.`,
        label: 'Close as unpaid',
        danger: true,
      }
    default:
      return { title: '', message: '', label: '', danger: false }
  }
})

async function load() {
  loading.value = true
  error.value = null
  try {
    entries.value = await listBountyQueue()
    if (!entries.value.some((e) => keyOf(e) === selectedKey.value)) {
      // The case left the queue (settled meanwhile): drop the selection and
      // any confirmation still open for it, so no empty dialog is left behind.
      selectedKey.value = null
      pendingAction.value = null
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Failed to load the queue.'
    entries.value = []
  } finally {
    loading.value = false
  }
}

async function runAction() {
  const entry = selected.value
  const action = pendingAction.value
  if (!entry || !action) return
  busy.value = true
  try {
    if (action === 'close') {
      await closeBountyUnpaid(entry.pet_id)
      toasts.success(`"${entry.pet_name}" closed as unpaid.`)
    } else if (entry.payment_id) {
      await ruleBountyPayment(entry.payment_id, action === 'confirm' ? 'Confirm' : 'Reject')
      toasts.success(
        action === 'confirm'
          ? `Payment for "${entry.pet_name}" confirmed. The case is Resolved.`
          : `Payment for "${entry.pet_name}" rejected. The owner was asked to pay again.`,
      )
    }
    pendingAction.value = null
    selectedKey.value = null
  } catch (cause) {
    toasts.error(cause instanceof Error ? cause.message : 'The ruling failed.')
  } finally {
    busy.value = false
    // Re-read either way: a 409 means the case changed under us (the owner
    // paid, or the hunter confirmed), and the list should show that.
    await load()
  }
}

onMounted(load)
</script>

<template>
  <PageHeader
    title="Bounty rulings"
    subtitle="Payments the owner and the hunter could not settle themselves."
    requirement="SRS-114 · SRS-116 · SRS-117"
  />

  <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6 xl:flex-row">
    <section class="flex min-w-0 flex-col rounded-2xl border border-stone-200 bg-white xl:w-[26rem]">
      <h2
        class="flex items-center justify-between border-b border-stone-200 px-4 py-3 text-sm font-semibold text-stone-700"
      >
        To rule on
        <span v-if="!loading && !error" class="text-xs font-normal text-stone-400">
          {{ entries.length }}
        </span>
      </h2>
      <DataState
        :loading="loading"
        :error="error"
        :empty="entries.length === 0"
        empty-message="Nothing to rule on. Every bounty is settled or still within its window."
        skeleton="list"
        :skeleton-rows="4"
        @retry="load"
      >
        <ul class="divide-y divide-stone-100 overflow-y-auto">
          <li v-for="entry in entries" :key="keyOf(entry)">
            <button
              type="button"
              :class="selectedKey === keyOf(entry) ? 'bg-orange-50' : 'hover:bg-stone-50'"
              class="flex w-full cursor-pointer flex-col gap-1 px-4 py-3 text-left transition-colors"
              @click="selectedKey = keyOf(entry)"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="truncate text-sm font-medium text-stone-800">{{ entry.pet_name }}</p>
                <span
                  :class="KIND_STYLE[entry.kind]"
                  class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                >
                  {{ KIND_LABEL[entry.kind] }}
                </span>
              </div>
              <p class="text-xs text-stone-500">
                {{ formatBounty(entry.amount) }} · since {{ formatDateTime(entry.since) }}
              </p>
            </button>
          </li>
        </ul>
      </DataState>
    </section>

    <section class="flex min-w-0 flex-1 flex-col rounded-2xl border border-stone-200 bg-white">
      <div v-if="!selected" class="flex flex-1 items-center justify-center p-10 text-sm text-stone-500">
        Select a case to rule on it.
      </div>

      <div v-else class="flex min-h-0 flex-1 flex-col">
        <div class="border-b border-stone-200 p-5">
          <div class="flex items-center gap-2">
            <h2 class="text-base font-semibold text-stone-900">{{ selected.pet_name }}</h2>
            <span :class="KIND_STYLE[selected.kind]" class="rounded-full px-2 py-0.5 text-[11px] font-semibold">
              {{ KIND_LABEL[selected.kind] }}
            </span>
          </div>
          <p class="mt-1 text-sm text-stone-500">
            {{ formatBounty(selected.amount) }} · owner {{ shortId(selected.owner_id) }} · hunter
            {{ shortId(selected.hunter_id) }}
          </p>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-5">
          <p v-if="!hasPayment" class="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No payment is awaiting confirmation for this case. Contact the owner; if they will not
            pay, close the report as unpaid.
          </p>
          <template v-if="selected.slip_image_url">
            <h3 class="text-sm font-semibold text-stone-700">
              {{ isRejectedSlip ? 'Rejected slip (for reference)' : 'Transfer slip' }}
            </h3>
            <a :href="selected.slip_image_url" target="_blank" rel="noopener" class="mt-2 block w-fit">
              <img
                :src="selected.slip_image_url"
                alt="Transfer slip"
                class="max-h-[28rem] rounded-xl border border-stone-200 object-contain"
              />
            </a>
            <a
              :href="selected.slip_image_url"
              target="_blank"
              rel="noopener"
              class="mt-2 inline-flex items-center gap-1 text-xs text-orange-700 hover:underline"
            >
              <ExternalLink :size="12" /> Open full size
            </a>
            <p class="mt-3 text-sm text-stone-600">
              Reference: <span class="font-medium">{{ selected.reference_no || '—' }}</span>
            </p>
          </template>
          <p class="mt-4 text-xs text-stone-500">
            Contact the owner and the hunter outside the console before ruling. The platform never
            holds the money; your ruling records the outcome.
          </p>
        </div>

        <footer class="flex flex-wrap gap-2 border-t border-stone-200 p-5">
          <template v-if="hasPayment">
            <button
              type="button"
              class="flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="busy"
              @click="pendingAction = 'confirm'"
            >
              <BadgeCheck :size="16" /> Confirm payment
            </button>
            <button
              type="button"
              class="flex cursor-pointer items-center gap-2 rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="busy"
              @click="pendingAction = 'reject'"
            >
              <XCircle :size="16" /> Reject payment
            </button>
          </template>
          <button
            v-else
            type="button"
            class="flex cursor-pointer items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="busy"
            @click="pendingAction = 'close'"
          >
            <Ban :size="16" /> Close as unpaid
          </button>
          <Loader2 v-if="busy" :size="18" class="animate-spin self-center text-stone-400" />
        </footer>
      </div>
    </section>
  </div>

  <ConfirmDialog
    :open="pendingAction !== null"
    :busy="busy"
    :title="dialog.title"
    :message="dialog.message"
    :confirm-label="dialog.label"
    :danger="dialog.danger"
    @confirm="runAction"
    @cancel="pendingAction = null"
  />
</template>
