<script setup lang="ts">
/**
 * Loading placeholders shaped like the content they stand in for.
 *
 * A spinner says "something is happening"; a skeleton says "a table of about
 * this size is arriving", which stops the layout jumping when it does. Each
 * variant mirrors one real component, so a change in row height belongs in
 * both places.
 */
withDefaults(
  defineProps<{ variant: 'table' | 'list' | 'timeline' | 'cards' | 'panel'; rows?: number }>(),
  {
    rows: 6,
  },
)

const BAR = 'animate-pulse rounded bg-stone-200'
</script>

<template>
  <!-- A table body: a thumbnail plus a few cells of varying width. -->
  <div v-if="variant === 'table'" class="divide-y divide-stone-100" aria-hidden="true">
    <div v-for="row in rows" :key="row" class="flex items-center gap-3 px-4 py-3">
      <div :class="BAR" class="h-10 w-10 shrink-0 rounded-lg" />
      <div :class="BAR" class="h-3.5 w-40" />
      <div :class="BAR" class="ml-auto h-3.5 w-16" />
      <div :class="BAR" class="h-5 w-20 rounded-full" />
      <div :class="BAR" class="h-3.5 w-24" />
    </div>
  </div>

  <!-- A queue or a case list: a badge line, then two lines of detail. -->
  <div v-else-if="variant === 'list'" class="divide-y divide-stone-100" aria-hidden="true">
    <div v-for="row in rows" :key="row" class="px-4 py-3">
      <div class="flex items-center justify-between gap-2">
        <div :class="BAR" class="h-5 w-24 rounded-full" />
        <div :class="BAR" class="h-3 w-12" />
      </div>
      <div :class="BAR" class="mt-2 h-3 w-32" />
    </div>
  </div>

  <!-- Timeline entries: photo on the left, three lines beside it. -->
  <div v-else-if="variant === 'timeline'" class="flex flex-col gap-3" aria-hidden="true">
    <div v-for="row in rows" :key="row" class="flex gap-4 rounded-xl border border-stone-200 p-3">
      <div :class="BAR" class="h-20 w-20 shrink-0 rounded-lg" />
      <div class="flex-1">
        <div class="flex gap-1.5">
          <div :class="BAR" class="h-5 w-20 rounded-full" />
          <div :class="BAR" class="h-5 w-24 rounded-full" />
        </div>
        <div :class="BAR" class="mt-2 h-3.5 w-48" />
        <div :class="BAR" class="mt-2 h-3 w-64" />
      </div>
    </div>
  </div>

  <!-- The dashboard's stat tiles. -->
  <div
    v-else-if="variant === 'cards'"
    class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    aria-hidden="true"
  >
    <div v-for="row in 4" :key="row" class="rounded-2xl border border-stone-200 bg-white p-5">
      <div :class="BAR" class="h-3 w-24" />
      <div :class="BAR" class="mt-3 h-8 w-16" />
      <div :class="BAR" class="mt-2 h-3 w-32" />
    </div>
  </div>

  <!-- One record: a square photo beside a short definition list. -->
  <div v-else class="flex flex-col gap-5 lg:flex-row" aria-hidden="true">
    <div :class="BAR" class="aspect-square w-full rounded-xl lg:w-72 lg:shrink-0" />
    <div class="flex-1 space-y-3">
      <div v-for="row in rows" :key="row" class="flex gap-6">
        <div :class="BAR" class="h-3.5 w-20" />
        <div :class="BAR" class="h-3.5 w-40" />
      </div>
    </div>
  </div>
</template>
