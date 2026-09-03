<script setup lang="ts">
/**
 * SRS-69 / UD-13 — every sighting logged against one report, newest first,
 * Dismissed entries included. The owner's copy of this list hides those; the
 * administrator's must not, or moderation would be invisible to the person
 * doing it.
 *
 * Each row also carries the SRS-82 controls, because the timeline is the other
 * place UD-16 says a sighting is moderated from.
 */
import DataState from '@/components/Common/DataState.vue'
import StatusBadge from '@/components/Common/StatusBadge.vue'
import MiniMap from '@/components/Common/MiniMap.vue'
import { formatDateTime, parseLocationStr, formatSimilarity, shortId } from '@/utils/format'
import type { TimelineEntry } from '@/types/domain'

defineProps<{
  entries: TimelineEntry[]
  loading: boolean
  error: string | null
  busy: boolean
}>()

const emit = defineEmits<{
  (e: 'retry'): void
  (e: 'moderate', sightingId: string, status: 'Verified' | 'Dismissed'): void
}>()
</script>

<template>
  <DataState
    :loading="loading"
    :error="error"
    :empty="entries.length === 0"
    empty-message="No sightings logged for this report."
    skeleton="timeline"
    :skeleton-rows="3"
    @retry="emit('retry')"
  >
    <ul class="flex flex-col gap-3">
      <li
        v-for="entry in entries"
        :key="entry.id"
        :class="entry.verification_status === 'Dismissed' ? 'opacity-60' : ''"
        class="flex gap-4 rounded-xl border border-stone-200 p-3"
      >
        <img
          v-if="entry.image_url"
          :src="entry.image_url"
          alt=""
          class="h-20 w-20 shrink-0 rounded-lg border border-stone-200 object-cover"
        />
        <div
          v-else
          class="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-stone-300 text-[11px] text-stone-400"
        >
          No photo
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-1.5">
            <StatusBadge :value="entry.action_type" />
            
            <div v-if="entry.verification_status !== 'Pending'" class="flex items-center gap-1 ml-2">
              <span class="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">Mod</span>
              <StatusBadge :value="entry.verification_status" />
            </div>

            <div v-if="entry.owner_status" class="flex items-center gap-1 ml-2">
              <span class="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">Owner</span>
              <StatusBadge :value="entry.owner_status" />
            </div>

            <span class="ml-auto text-[11px] text-stone-400">
              {{ formatDateTime(entry.created_at) }}
            </span>
          </div>

          <p class="mt-1.5 text-sm text-stone-700">
            {{ entry.hunter_display_name || shortId(entry.hunter_id) }}
            <span class="text-stone-400">· {{ entry.detected_species ?? 'unknown species' }}</span>
          </p>
          <p class="mt-0.5 font-mono text-[11px] text-stone-500">
            similarity {{ formatSimilarity(entry.similarity_score) }} · {{ entry.match_source }}
          </p>
          <div v-if="parseLocationStr(entry.sighted_location)" class="mt-2 w-full sm:w-64 h-24">
            <MiniMap 
              :lat="parseLocationStr(entry.sighted_location)!.lat" 
              :lng="parseLocationStr(entry.sighted_location)!.lng" 
              class="h-full"
            />
          </div>

          <div class="mt-2">
            <button
              v-if="entry.verification_status !== 'Dismissed'"
              type="button"
              class="cursor-pointer rounded-lg border border-rose-200 px-2.5 py-1 text-[11px] font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-60"
              :disabled="busy"
              @click="emit('moderate', entry.id, 'Dismissed')"
            >
              Withdraw
            </button>
            <button
              v-else
              type="button"
              class="cursor-pointer rounded-lg border border-stone-300 px-2.5 py-1 text-[11px] font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:opacity-60"
              :disabled="busy"
              @click="emit('moderate', entry.id, 'Verified')"
            >
              Reverse dismissal
            </button>
          </div>
        </div>
      </li>
    </ul>
  </DataState>
</template>
