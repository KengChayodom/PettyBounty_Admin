<script setup lang="ts">
defineProps<{ title: string; subtitle: string; requirement?: string }>()
</script>

<template>
  <header class="border-b border-stone-200 bg-white px-6 py-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0">
        <h1 class="text-xl font-bold text-stone-900">{{ title }}</h1>
        <p class="mt-0.5 text-sm text-stone-500">{{ subtitle }}</p>
      </div>
      <div class="flex items-center gap-3">
        <!-- The requirement each screen realises, kept visible: this project is
             spec-driven and a screen that drifts from its SRS item is a bug. -->
        <span
          v-if="requirement"
          class="rounded-full bg-stone-100 px-3 py-1 font-mono text-[11px] text-stone-500"
        >
          {{ requirement }}
        </span>
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
