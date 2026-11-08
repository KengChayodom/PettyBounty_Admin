<script setup lang="ts">
import { CheckCircle2, Info, X, XCircle } from 'lucide-vue-next'
import { useToastStore } from '@/stores/toast'

const toasts = useToastStore()

const TONES = {
  success: { icon: CheckCircle2, ring: 'border-emerald-200', text: 'text-emerald-700' },
  error: { icon: XCircle, ring: 'border-rose-200', text: 'text-rose-700' },
  info: { icon: Info, ring: 'border-stone-200', text: 'text-stone-700' },
} as const
</script>

<template>
  <div class="fixed bottom-6 right-6 z-50 flex w-[min(24rem,calc(100vw-3rem))] flex-col gap-2">
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-for="toast in toasts.toasts"
        :key="toast.id"
        role="status"
        :class="TONES[toast.tone].ring"
        class="flex items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg"
      >
        <component :is="TONES[toast.tone].icon" :size="18" :class="TONES[toast.tone].text" />
        <p class="flex-1 text-sm text-stone-700">{{ toast.message }}</p>
        <button
          type="button"
          class="cursor-pointer text-stone-400 transition-colors hover:text-stone-600"
          aria-label="Dismiss notification"
          @click="toasts.dismiss(toast.id)"
        >
          <X :size="16" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
