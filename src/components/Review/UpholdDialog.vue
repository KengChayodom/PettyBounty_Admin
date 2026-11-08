<script setup lang="ts">
/**
 * The uphold ruling.
 *
 * The field opens on the per-reason default and stays editable within 0-100:
 * the cap keeps a mistyped extra digit from wiping a hunter's history, and 0 is
 * a legitimate ruling that withdraws the sighting without charging for it.
 * The dialog is explicit that no account is touched, because the wording it
 * replaced ("Uphold and Ban User") is still in circulation in older specs.
 */
import { ref, watch } from 'vue'
import { ShieldX } from 'lucide-vue-next'
import { DEFAULT_PENALTY_BY_REASON, FLAG_REASON_LABEL, MAX_PENALTY_POINTS } from '@/types/domain'
import type { FlagReason } from '@/types/domain'

const props = defineProps<{ open: boolean; reason: FlagReason; busy: boolean }>()
const emit = defineEmits<{ (e: 'confirm', points: number): void; (e: 'cancel'): void }>()

const points = ref(DEFAULT_PENALTY_BY_REASON[props.reason])

// Re-arm on every open: the operator may have edited the value for a previous
// flag, and carrying that number onto a different reason would be a silent
// mis-ruling.
watch(
  () => [props.open, props.reason] as const,
  ([open, reason]) => {
    if (open) points.value = DEFAULT_PENALTY_BY_REASON[reason]
  },
)

function confirm() {
  const clamped = Math.min(MAX_PENALTY_POINTS, Math.max(0, Math.round(points.value || 0)))
  points.value = clamped
  emit('confirm', clamped)
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0"
    leave-active-class="transition duration-100 ease-in"
    leave-to-class="opacity-0"
  >
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      @click.self="emit('cancel')"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div class="flex items-start gap-3">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600"
          >
            <ShieldX :size="20" />
          </div>
          <div class="min-w-0">
            <h2 class="text-base font-semibold text-stone-900">Uphold this flag</h2>
            <p class="mt-1 text-sm text-stone-600">
              The sighting is withdrawn from every owner timeline and from scoring, and the hunter
              who submitted it loses score. The account itself is not suspended.
            </p>
          </div>
        </div>

        <label class="mt-5 block text-sm font-medium text-stone-700" for="penalty">
          Points to deduct
          <span class="font-normal text-stone-400">
            · default for {{ FLAG_REASON_LABEL[props.reason] }} is
            {{ DEFAULT_PENALTY_BY_REASON[props.reason] }}
          </span>
        </label>
        <input
          id="penalty"
          v-model.number="points"
          type="number"
          min="0"
          :max="MAX_PENALTY_POINTS"
          class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
        />
        <p class="mt-1.5 text-xs text-stone-400">
          0–{{ MAX_PENALTY_POINTS }}. A hunter's total never falls below zero. 0 withdraws the
          sighting without deducting anything.
        </p>

        <div class="mt-6 flex justify-end gap-2">
          <button
            type="button"
            class="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100"
            :disabled="busy"
            @click="emit('cancel')"
          >
            Cancel
          </button>
          <button
            type="button"
            class="cursor-pointer rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
            :disabled="busy"
            @click="confirm"
          >
            {{ busy ? 'Working…' : 'Uphold and Penalise User' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
