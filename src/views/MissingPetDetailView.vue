<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Trash2 } from 'lucide-vue-next'
import ConfirmDialog from '@/components/Common/ConfirmDialog.vue'
import PageHeader from '@/components/Common/PageHeader.vue'
import StatusBadge from '@/components/Common/StatusBadge.vue'
import MiniMap from '@/components/Common/MiniMap.vue'
import PetTimeline from '@/components/Pets/PetTimeline.vue'
import { fetchMissingPet, fetchSightingTimeline, removeMissingPet, setSightingVerification } from '@/api/admin'
import { useToastStore } from '@/stores/toast'
import { formatBounty, formatDateTime, shortId, parseLocationStr } from '@/utils/format'
import type { MissingPet, TimelineEntry } from '@/types/domain'

const TIMELINE_PAGE = { limit: 100, offset: 0 }

const route = useRoute()
const router = useRouter()
const toasts = useToastStore()

const petId = computed(() => route.params.id as string)

const pet = ref<MissingPet | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const timeline = ref<TimelineEntry[]>([])
const timelineLoading = ref(false)
const timelineError = ref<string | null>(null)

const removeOpen = ref(false)
const busy = ref(false)

const isHexColor = (val: unknown) => typeof val === 'string' && /^#([0-9A-Fa-f]{3}){1,2}$/.test(val)

const locationCoords = computed(() => pet.value ? parseLocationStr(pet.value.last_seen_location) : null)

async function loadPet() {
  loading.value = true
  error.value = null
  try {
    pet.value = await fetchMissingPet(petId.value)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Failed to load pet details.'
  } finally {
    loading.value = false
  }
}

async function loadTimeline() {
  timelineLoading.value = true
  timelineError.value = null
  try {
    timeline.value = await fetchSightingTimeline(petId.value, TIMELINE_PAGE)
  } catch (cause) {
    timelineError.value = cause instanceof Error ? cause.message : 'Failed to load the timeline.'
  } finally {
    timelineLoading.value = false
  }
}

async function moderate(sightingId: string, status: 'Verified' | 'Dismissed') {
  busy.value = true
  try {
    await setSightingVerification(sightingId, status)
    toasts.success(
      status === 'Dismissed'
        ? 'Sighting withdrawn from every owner timeline and from scoring.'
        : 'Dismissal reversed.',
    )
    await loadTimeline()
  } catch (cause) {
    toasts.error(cause instanceof Error ? cause.message : 'The action failed.')
  } finally {
    busy.value = false
  }
}

async function confirmRemove() {
  if (!pet.value) return
  busy.value = true
  try {
    await removeMissingPet(pet.value.id)
    toasts.success(`"${pet.value.pet_name}" removed from the database and the search map.`)
    removeOpen.value = false
    router.replace('/missing-pets')
  } catch (cause) {
    toasts.error(cause instanceof Error ? cause.message : 'Failed to remove the report.')
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  loadPet()
  loadTimeline()
})
</script>

<template>
  <PageHeader
    title="Missing pet report"
    subtitle="Review details and sighting timeline"
  />

  <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
    <button 
      class="flex items-center gap-2 text-stone-500 hover:text-stone-900 w-fit transition-colors text-sm font-medium"
      @click="router.back()"
    >
      <ArrowLeft :size="16" /> Back to list
    </button>

    <div v-if="loading" class="animate-pulse bg-stone-100 h-64 rounded-2xl"></div>
    <div v-else-if="error" class="text-rose-500 p-6 bg-rose-50 rounded-2xl">{{ error }}</div>
    
    <div v-else-if="pet" class="flex flex-col xl:flex-row gap-6">
      
      <!-- Pet Info Card -->
      <section class="flex flex-col rounded-2xl border border-stone-200 bg-white xl:w-[28rem] flex-shrink-0">
        <div class="p-6 border-b border-stone-100">
          <img 
            :src="pet.image_url" 
            alt="Pet" 
            class="w-full h-64 object-cover rounded-xl border border-stone-200 mb-6"
          />
          
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-xl font-bold text-stone-900">{{ pet.pet_name }}</h2>
              <p class="text-stone-500 capitalize">{{ pet.species }}</p>
            </div>
            <StatusBadge
              :value="pet.status === 'Searching' && (pet.sighting_count ?? 0) > 0 ? 'Spotted' : pet.status"
            />
          </div>

          <div class="mt-6 space-y-4 text-sm">
            <div class="flex justify-between border-b border-stone-100 pb-3">
              <span class="text-stone-500">Bounty</span>
              <span class="font-medium text-stone-900">{{ formatBounty(pet.bounty_amount) }}</span>
            </div>
            <div class="flex justify-between border-b border-stone-100 pb-3">
              <span class="text-stone-500">Owner ID</span>
              <span class="font-mono text-stone-900">{{ shortId(pet.owner_id) }}</span>
            </div>
            <div class="flex justify-between border-b border-stone-100 pb-3">
              <span class="text-stone-500">Reported on</span>
              <span class="text-stone-900">{{ formatDateTime(pet.created_at) }}</span>
            </div>
            <div class="flex flex-col gap-2 border-b border-stone-100 pb-4">
              <div class="flex justify-between">
                <span class="text-stone-500">Last seen</span>
                <span class="text-stone-900">{{ formatDateTime(pet.last_seen_time) }}</span>
              </div>
              <MiniMap 
                v-if="locationCoords" 
                :lat="locationCoords.lat" 
                :lng="locationCoords.lng" 
                class="mt-1 h-32"
              />
            </div>
            <div>
              <span class="text-stone-500 block mb-2">Characteristics</span>
              <div class="flex flex-wrap gap-2">
                <span 
                  v-for="(val, key) in (pet.characteristics as Record<string, unknown>)" 
                  :key="key"
                  class="flex items-center gap-1.5 bg-stone-100 text-stone-700 px-2.5 py-1.5 rounded-md text-xs border border-stone-200/50"
                >
                  <strong class="capitalize font-semibold text-stone-900">{{ key }}:</strong>
                  
                  <!-- Color Swatch Visualization -->
                  <span v-if="isHexColor(val)" class="flex items-center gap-1.5">
                    <span 
                      class="w-3 h-3 rounded-full border border-stone-300 shadow-sm inline-block"
                      :style="{ backgroundColor: val as string }"
                    ></span>
                    <span class="font-mono text-[10px]">{{ val }}</span>
                  </span>
                  
                  <!-- Regular Text -->
                  <span v-else>{{ val }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="p-6 mt-auto">
          <button
            type="button"
            class="w-full flex cursor-pointer justify-center items-center gap-2 rounded-lg border border-rose-200 px-4 py-2.5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50"
            @click="removeOpen = true"
          >
            <Trash2 :size="16" /> Remove report
          </button>
        </div>
      </section>

      <!-- Sighting Timeline -->
      <section class="flex flex-1 flex-col rounded-2xl border border-stone-200 bg-white min-h-[500px]">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 p-6">
          <div>
            <h2 class="text-base font-semibold text-stone-900">
              Sighting timeline
            </h2>
            <p class="mt-0.5 text-xs text-stone-500">
              Includes dismissed entries, which the owner's own timeline hides.
            </p>
          </div>
        </div>
        
        <div class="flex-1 overflow-y-auto p-6">
          <PetTimeline
            :entries="timeline"
            :loading="timelineLoading"
            :error="timelineError"
            :busy="busy"
            @retry="loadTimeline"
            @moderate="moderate"
          />
        </div>
      </section>
      
    </div>
  </div>

  <ConfirmDialog
    :open="removeOpen"
    danger
    :busy="busy"
    title="Remove this report?"
    :message="`&quot;${pet?.pet_name ?? ''}&quot; will be deleted from the database and disappear from the search map, along with its match links. This cannot be undone.`"
    confirm-label="Remove report"
    @confirm="confirmRemove"
    @cancel="removeOpen = false"
  />
</template>
