<script setup lang="ts">
/**
 * The three states every list in this console can be in. Kept in one place so
 * "loading", "this failed and here is why", and "there is nothing here" never
 * get confused with one another — an empty table after a failed request is the
 * one outcome a moderation queue must never show.
 *
 * Pass `skeleton` to stand in for the content while it loads; without it the
 * loading state falls back to a spinner, which is right for a small panel and
 * wrong for anything that will push the page around when it arrives.
 */
import { Loader2, AlertCircle, Inbox } from 'lucide-vue-next'
import Skeleton from '@/components/Common/Skeleton.vue'

defineProps<{
  loading: boolean
  error: string | null
  empty: boolean
  emptyMessage: string
  skeleton?: 'table' | 'list' | 'timeline' | 'cards' | 'panel'
  skeletonRows?: number
}>()
const emit = defineEmits<{ (e: 'retry'): void }>()
</script>

<template>
  <template v-if="loading">
    <Skeleton v-if="skeleton" :variant="skeleton" :rows="skeletonRows ?? 6" />
    <div v-else class="flex items-center justify-center gap-2 py-16 text-stone-500">
      <Loader2 :size="18" class="animate-spin" />
      <span class="text-sm">Loading…</span>
    </div>
  </template>

  <div v-else-if="error" class="flex flex-col items-center gap-3 py-16 text-center">
    <AlertCircle :size="24" class="text-rose-500" />
    <p class="max-w-md text-sm text-stone-600">{{ error }}</p>
    <button
      type="button"
      class="cursor-pointer rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
      @click="emit('retry')"
    >
      Try again
    </button>
  </div>

  <div v-else-if="empty" class="flex flex-col items-center gap-3 py-16 text-center">
    <Inbox :size="24" class="text-stone-400" />
    <p class="text-sm text-stone-500">{{ emptyMessage }}</p>
  </div>

  <slot v-else />
</template>
