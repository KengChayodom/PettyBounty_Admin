<script setup lang="ts">
/**
 * Numbered paging, driven by the total the endpoint returns.
 *
 * The previous version could only offer "next" when a page came back full,
 * which is a guess: it showed a next button on the last page whenever the row
 * count divided evenly, and it could never say how many pages there were. With
 * `total` from the server there is nothing to infer.
 *
 * Long ranges collapse to first / … / window / … / last so the control keeps
 * its width whether there are three pages or three hundred.
 */
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { pageWindow } from '@/utils/pagination'

const props = defineProps<{
  page: number
  pageSize: number
  total: number
  /** Rows actually rendered — the "showing x–y" line is about them, not the window. */
  count: number
}>()
const emit = defineEmits<{ (e: 'update:page', value: number): void }>()

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const first = computed(() => (props.count === 0 ? 0 : (props.page - 1) * props.pageSize + 1))
const last = computed(() => (props.page - 1) * props.pageSize + props.count)

const pages = computed(() => pageWindow(props.page, pageCount.value))

function go(value: number) {
  const clamped = Math.min(pageCount.value, Math.max(1, value))
  if (clamped !== props.page) emit('update:page', clamped)
}
</script>

<template>
  <nav
    class="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-4 py-3"
    aria-label="Pagination"
  >
    <p class="text-xs text-stone-500">
      Showing <span class="font-medium text-stone-700">{{ first }}–{{ last }}</span> of
      <span class="font-medium text-stone-700">{{ total }}</span>
    </p>

    <div class="flex items-center gap-1">
      <button
        type="button"
        class="flex cursor-pointer items-center gap-1 rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="page <= 1"
        aria-label="Previous page"
        @click="go(page - 1)"
      >
        <ChevronLeft :size="16" />
      </button>

      <template v-for="(entry, index) in pages" :key="index">
        <span v-if="entry === null" class="px-1 text-sm text-stone-400">…</span>
        <button
          v-else
          type="button"
          :class="
            entry === page
              ? 'bg-[#362621] text-white'
              : 'border border-stone-300 text-stone-700 hover:bg-stone-100'
          "
          class="min-w-9 cursor-pointer rounded-lg px-2.5 py-1.5 text-sm transition-colors"
          :aria-current="entry === page ? 'page' : undefined"
          @click="go(entry)"
        >
          {{ entry }}
        </button>
      </template>

      <button
        type="button"
        class="flex cursor-pointer items-center gap-1 rounded-lg border border-stone-300 px-2.5 py-1.5 text-sm text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="page >= pageCount"
        aria-label="Next page"
        @click="go(page + 1)"
      >
        <ChevronRight :size="16" />
      </button>
    </div>
  </nav>
</template>
