<script setup lang="ts">
/**
 * A modal for the actions that cannot be taken back — removing a report,
 * paying a bounty. `danger` styles the confirm button for a destructive one.
 */
import { AlertTriangle } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    danger?: boolean
    busy?: boolean
  }>(),
  { confirmLabel: 'Confirm', danger: false, busy: false },
)

const emit = defineEmits<{ (e: 'confirm'): void; (e: 'cancel'): void }>()
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
            :class="danger ? 'bg-rose-100 text-rose-600' : 'bg-orange-100 text-orange-600'"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          >
            <AlertTriangle :size="20" />
          </div>
          <div class="min-w-0">
            <h2 class="text-base font-semibold text-stone-900">{{ title }}</h2>
            <p class="mt-1 text-sm text-stone-600">{{ message }}</p>
          </div>
        </div>

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
            :class="danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-orange-600 hover:bg-orange-700'"
            class="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60"
            :disabled="busy"
            @click="emit('confirm')"
          >
            {{ busy ? 'Working…' : confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
