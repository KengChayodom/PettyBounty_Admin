<script setup lang="ts">
/**
 * What the administrator is actually ruling on: the photo, plus the facts that
 * decide a flag (species, action type, where and when, current moderation
 * state). The use case lists exactly this.
 */
import DataState from '@/components/Common/DataState.vue'
import StatusBadge from '@/components/Common/StatusBadge.vue'
import MiniMap from '@/components/Common/MiniMap.vue'
import { formatDateTime, parseLocationStr, shortId } from '@/utils/format'
import type { Sighting } from '@/types/domain'
import { computed } from 'vue'

const props = defineProps<{ sighting: Sighting | null; loading: boolean; error: string | null }>()
const emit = defineEmits<{ (e: 'retry'): void }>()

const coords = computed(() => props.sighting ? parseLocationStr(props.sighting.sighted_location) : null)
</script>

<template>
  <DataState
    :loading="loading"
    :error="error"
    :empty="!sighting"
    empty-message="This flag carries no sighting — nothing to display."
    skeleton="panel"
    :skeleton-rows="5"
    @retry="emit('retry')"
  >
    <div v-if="sighting" :data-testid="`sighting-${sighting.id}-hunter-${sighting.hunter_id}`" class="flex flex-col gap-5 lg:flex-row">
      <div class="lg:w-72 lg:shrink-0">
        <img
          v-if="sighting.image_url"
          :src="sighting.image_url"
          alt="Flagged sighting photo"
          class="aspect-square w-full rounded-xl border border-stone-200 object-cover"
        />
        <div
          v-else
          class="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-stone-300 text-sm text-stone-400"
        >
          No photo
        </div>
      </div>

      <dl class="grid min-w-0 flex-1 grid-cols-[auto_1fr] gap-x-6 gap-y-3 self-start text-sm">
        <dt class="text-stone-500">Sighting</dt>
        <dd class="font-mono text-stone-800">{{ shortId(sighting.id) }}</dd>

        <dt class="text-stone-500">Hunter</dt>
        <dd class="font-mono text-stone-800">{{ shortId(sighting.hunter_id) }}</dd>

        <dt class="text-stone-500">Species</dt>
        <dd class="text-stone-800">{{ sighting.detected_species ?? '—' }}</dd>

        <dt class="text-stone-500">Action</dt>
        <dd><StatusBadge :value="sighting.action_type" /></dd>

        <dt class="text-stone-500">Reported</dt>
        <dd class="text-stone-800">{{ formatDateTime(sighting.created_at) }}</dd>

        <dt class="text-stone-500">Location</dt>
        <dd class="flex flex-col gap-2">
          <MiniMap v-if="coords" :lat="coords.lat" :lng="coords.lng" class="h-32" />
          <span v-else class="text-stone-500">—</span>
        </dd>

        <dt class="text-stone-500">Moderation</dt>
        <dd><StatusBadge :value="sighting.verification_status" /></dd>
      </dl>
    </div>
  </DataState>
</template>
