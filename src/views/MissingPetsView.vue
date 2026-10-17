<script setup lang="ts">
/**
 * Browse every report on the platform, read any
 * report's full sighting timeline, and remove one that breaks the guidelines.
 *
 * Removal is a hard delete with no undo (the postcondition is "removed from
 * the database and the search map"), so it is the one action here behind a
 * confirmation naming the pet.
 */
import { computed, onMounted, ref, watch } from 'vue'
import DataState from '@/components/Common/DataState.vue'
import PageHeader from '@/components/Common/PageHeader.vue'
import Pagination from '@/components/Common/Pagination.vue'
import StatusBadge from '@/components/Common/StatusBadge.vue'
import { listMissingPets } from '@/api/admin'
import { isServerFailure } from '@/api/http'
import { useListQuery } from '@/composables/useListQuery'
import { formatBounty, formatDateTime, shortId } from '@/utils/format'
import type { MissingPet, PetStatus } from '@/types/domain'

import { useRouter } from 'vue-router'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const
const TIMELINE_PAGE = { limit: 100, offset: 0 }

// "Spotted" is a derived state (sighting_count > 0 while still Searching) —
// it is never stored in the DB column, so we cannot pass it to the backend as
// a status filter. Instead, when the user picks "Spotted" we send
// status=Searching to the backend and client-side filter the page to rows
// where sighting_count > 0. Pagination total will show the Searching count
// (not the exact Spotted count) — acceptable for an admin tool.
const PET_STATUSES = ['Searching', 'Spotted', 'Found', 'Resolved'] as const
const SPECIES_OPTIONS = ['Cat', 'Dog', 'Bird', 'Other'] as const
const FILTERS: { label: string; value: typeof PET_STATUSES[number] | null }[] = [
  { label: 'All', value: null },
  { label: 'Searching', value: 'Searching' },
  { label: 'Spotted', value: 'Spotted' },
  { label: 'Found', value: 'Found' },
  { label: 'Resolved', value: 'Resolved' },
]

const router = useRouter()
const pageSize = ref<number>(20)
const species = ref<typeof SPECIES_OPTIONS[number] | null>(null)

// Page and filter live in the URL, so a reload or a shared link lands on the
// same rows (see useListQuery).
const { page, status, setPage, setStatus } = useListQuery({ statuses: PET_STATUSES })
const offset = computed(() => (page.value - 1) * pageSize.value)

const pets = ref<MissingPet[]>([])
const total = ref(0)
const loading = ref(true)
const error = ref<string | null>(null)

let loadId = 0

async function loadPets() {
  const id = ++loadId
  loading.value = true
  error.value = null
  try {
    // Send status.value directly — the backend now understands 'Spotted' and
    // 'Searching' as derived filters and returns the correct items + total.
    const data = await listMissingPets(
      { limit: pageSize.value, offset: offset.value },
      status.value,
      species.value,
    )
    if (id !== loadId) return
    pets.value = data.items
    total.value = data.total
  } catch (cause) {
    if (id !== loadId) return
    error.value = isServerFailure(cause)
      ? 'Connection error. Unable to load reports.'
      : (cause as Error).message
    pets.value = []
    total.value = 0
  } finally {
    if (id === loadId) loading.value = false
  }
}

watch([page, status, pageSize, species], loadPets)
watch([pageSize, species], () => { if (page.value !== 1) setPage(1) })
onMounted(loadPets)
</script>

<template>
  <PageHeader
    title="Missing pet reports"
    subtitle="Every report on the platform, its full sighting timeline, and guideline removal."
  />

  <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
    <section class="flex min-w-0 flex-col rounded-2xl border border-stone-200 bg-white">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 p-3">
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="option in FILTERS"
            :key="option.label"
            type="button"
            :class="
              status === option.value
                ? 'bg-[#362621] text-white'
                : 'text-stone-600 hover:bg-stone-100'
            "
            class="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            @click="setStatus(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
        
        <select
          v-model="species"
          class="cursor-pointer rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600 outline-none focus:border-orange-400"
        >
          <option :value="null">All Species</option>
          <option v-for="s in SPECIES_OPTIONS" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>

      <DataState
        :loading="loading"
        :error="error"
        :empty="pets.length === 0"
        empty-message="No reports match this filter."
        skeleton="table"
        @retry="loadPets"
      >
        <div class="flex-1 overflow-y-auto overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="sticky top-0 z-10 bg-white border-b border-stone-200 text-left text-xs text-stone-500">
              <tr>
                <th class="px-4 py-2 font-medium">Pet</th>
                <th class="px-4 py-2 font-medium">Species</th>
                <th class="px-4 py-2 font-medium whitespace-nowrap">Status</th>
                <th class="px-4 py-2 font-medium">Bounty</th>
                <th class="px-4 py-2 font-medium">Reported</th>
                <th class="px-4 py-2 font-medium">Owner</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-stone-100">
              <tr
                v-for="pet in pets"
                :key="pet.id"
                class="hover:bg-stone-50 cursor-pointer transition-colors"
                @click="router.push(`/missing-pets/${pet.id}`)"
              >
                <td class="px-4 py-2.5">
                  <div class="flex items-center gap-3">
                    <img
                      v-if="pet.image_url"
                      :src="pet.image_url"
                      alt=""
                      class="h-10 w-10 rounded-lg border border-stone-200 object-cover flex-shrink-0"
                    />
                    <span class="font-medium text-stone-800 whitespace-nowrap">{{ pet.pet_name }}</span>
                  </div>
                </td>
                <td class="px-4 py-2.5 text-stone-600 capitalize">{{ pet.species }}</td>
                 <td class="px-4 py-2.5">
                   <!-- Option B: derive "Spotted" from sighting_count so the badge
                        stays in the same vocabulary as the filter (Searching /
                        Spotted / Found / Resolved). "Spotted" is never stored
                        in the DB column — it is inferred here from the count
                        that attach_sighting_counts() now includes on every row. -->
                   <StatusBadge
                     :value="pet.status === 'Searching' && (pet.sighting_count ?? 0) > 0 ? 'Spotted' : pet.status"
                   />
                 </td>
                <td class="px-4 py-2.5 text-stone-700 whitespace-nowrap">{{ formatBounty(pet.bounty_amount) }}</td>
                <td class="px-4 py-2.5 text-stone-600 whitespace-nowrap">{{ formatDateTime(pet.created_at) }}</td>
                <td class="px-4 py-2.5 font-mono text-xs text-stone-500">
                  {{ shortId(pet.owner_id) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </DataState>

      <div v-if="!error && total > 0" class="flex items-center justify-between gap-3 border-t border-stone-100 px-3 py-2 mt-auto">
        <select
          v-model="pageSize"
          class="cursor-pointer rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs text-stone-600 outline-none focus:border-orange-400"
        >
          <option v-for="n in PAGE_SIZE_OPTIONS" :key="n" :value="n">{{ n }} / page</option>
        </select>
        <Pagination
          :page="page"
          :page-size="pageSize"
          :total="total"
          :count="pets.length"
          @update:page="setPage"
        />
      </div>
    </section>
  </div>
</template>
