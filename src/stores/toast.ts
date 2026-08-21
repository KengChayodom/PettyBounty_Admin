/**
 * Transient confirmations and errors.
 *
 * Every moderation action in this console is a write with a consequence — a
 * deleted report, a deducted score, a paid bounty — so each one says what
 * happened rather than silently refreshing a table.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastTone = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  tone: ToastTone
  message: string
}

const DISMISS_AFTER_MS = 5000

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])
  let nextId = 1

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function push(tone: ToastTone, message: string) {
    const id = nextId++
    toasts.value = [...toasts.value, { id, tone, message }]
    window.setTimeout(() => dismiss(id), DISMISS_AFTER_MS)
  }

  return {
    toasts,
    dismiss,
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
    info: (message: string) => push('info', message),
  }
})
