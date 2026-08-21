<script setup lang="ts">
/**
 * One pill for every enum this console shows. The tone map is keyed by the
 * literal database value so a status with no entry still renders (in grey)
 * instead of disappearing — a new enum value must never make a row look clean.
 */
import { computed } from 'vue'
import { FLAG_REASON_LABEL } from '@/types/domain'

const props = defineProps<{ value: string | null | undefined }>()

const TONES: Record<string, string> = {
  // verification_status / report_status
  Pending: 'border-amber-500',
  Verified: 'border-emerald-500',
  Dismissed: 'border-rose-500',
  Reviewed_Penalty: 'border-rose-500',
  // pet_status (raw DB column — kept for backward compat)
  Searching: 'border-red-500',
  Found: 'border-emerald-500',
  Resolved: 'border-stone-400',
  // post_status (derived badge from pet_logic — what the admin console now shows)
  Spotted: 'border-indigo-500',
  Expired: 'border-stone-400',
  Rescued: 'border-emerald-500',
  // owner_decision
  Confirmed: 'border-emerald-500',
  Rejected: 'border-rose-500',
  // action_type
  Caught: 'border-orange-500',
}

const LABELS: Record<string, string> = {
  ...FLAG_REASON_LABEL,
  Reviewed_Penalty: 'Upheld · score deducted',
}

const tone = computed(
  () => TONES[props.value ?? ''] ?? 'border-stone-300',
)
const label = computed(() => LABELS[props.value ?? ''] ?? props.value ?? '—')
</script>

<template>
  <span
    :class="[
      'inline-flex items-center border-l-4 bg-stone-100 text-stone-700 rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
      tone
    ]"
  >
    {{ label }}
  </span>
</template>
