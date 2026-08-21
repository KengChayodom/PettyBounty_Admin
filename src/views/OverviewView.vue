<script setup lang="ts">
/**
 * Platform pulse.
 *
 * Each tile is a `total` from a listing endpoint, so the numbers are counts of
 * everything matching the filter rather than of whatever fitted in one page.
 * That is why the three requests ask for five rows each: the tile needs the
 * count, and the panels below only ever show the newest few.
 */
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { BadgeDollarSign, Flag, PawPrint, ShieldAlert } from 'lucide-vue-next'
import DataState from '@/components/Common/DataState.vue'
import PageHeader from '@/components/Common/PageHeader.vue'
import StatusBadge from '@/components/Common/StatusBadge.vue'
import { listFlags, listMissingPets } from '@/api/admin'
import { formatBounty, formatRelative, shortId } from '@/utils/format'
import type { Flag as FlagRow, MissingPet } from '@/types/domain'

/** Enough rows for the two preview panels; the tiles read `total`, not length. */
const PREVIEW = 5

const pendingFlags = ref<FlagRow[]>([])
const awaitingPayout = ref<MissingPet[]>([])
const flagCount = ref(0)
const searchingCount = ref(0)
const payoutCount = ref(0)
const loading = ref(true)
const error = ref<string | null>(null)

/**
 * Only the bounties on this page are summed, so the figure is exact while the
 * settlement queue fits in one preview and understates it otherwise. The tile
 * says which of the two it is rather than presenting a partial sum as a total.
 */
const bountyOnPage = computed(() =>
  awaitingPayout.value.reduce((sum, pet) => sum + Number(pet.bounty_amount ?? 0), 0),
)

async function load() {
  loading.value = true
  error.value = null
  try {
    const [flags, active, found] = await Promise.all([
      listFlags({ limit: PREVIEW, offset: 0 }, 'Pending'),
      listMissingPets({ limit: 1, offset: 0 }, 'Searching'),
      listMissingPets({ limit: PREVIEW, offset: 0 }, 'Found'),
    ])
    pendingFlags.value = flags.items
    flagCount.value = flags.total
    searchingCount.value = active.total
    awaitingPayout.value = found.items
    payoutCount.value = found.total
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Failed to load the dashboard.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <PageHeader
    title="Overview"
    subtitle="What needs an administrator right now."
  />

  <div class="min-h-0 flex-1 overflow-y-auto p-6">
    <DataState
      :loading="loading"
      :error="error"
      :empty="false"
      empty-message=""
      skeleton="cards"
      @retry="load"
    >
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RouterLink
          to="/moderation"
          class="rounded-2xl border border-stone-200 bg-white p-5 transition-colors hover:border-orange-300"
        >
          <div class="flex items-center gap-2 text-stone-500">
            <ShieldAlert :size="16" /><span class="text-xs font-medium">Flags pending</span>
          </div>
          <p class="mt-2 text-3xl font-bold text-stone-900">{{ flagCount }}</p>
          <p class="mt-1 text-xs text-stone-400">Waiting on a moderation decision</p>
        </RouterLink>

        <RouterLink
          to="/bounty"
          class="rounded-2xl border border-stone-200 bg-white p-5 transition-colors hover:border-orange-300"
        >
          <div class="flex items-center gap-2 text-stone-500">
            <BadgeDollarSign :size="16" /><span class="text-xs font-medium">Awaiting payout</span>
          </div>
          <p class="mt-2 text-3xl font-bold text-stone-900">{{ payoutCount }}</p>
          <p class="mt-1 text-xs text-stone-400">
            {{ formatBounty(bountyOnPage) }}
            {{
              payoutCount > awaitingPayout.length
                ? 'on the newest ' + awaitingPayout.length
                : 'outstanding'
            }}
          </p>
        </RouterLink>

        <RouterLink
          to="/missing-pets"
          class="rounded-2xl border border-stone-200 bg-white p-5 transition-colors hover:border-orange-300"
        >
          <div class="flex items-center gap-2 text-stone-500">
            <PawPrint :size="16" /><span class="text-xs font-medium">Active searches</span>
          </div>
          <p class="mt-2 text-3xl font-bold text-stone-900">{{ searchingCount }}</p>
          <p class="mt-1 text-xs text-stone-400">Reports still marked Searching</p>
        </RouterLink>

        <div class="rounded-2xl border border-stone-200 bg-white p-5">
          <div class="flex items-center gap-2 text-stone-500">
            <Flag :size="16" /><span class="text-xs font-medium">Not an admin duty</span>
          </div>
          <p class="mt-2 text-sm text-stone-600">
            Owners confirm their own sightings and close their own case; the points follow that
            confirmation. Accounts are never suspended — an upheld flag deducts score instead.
          </p>
        </div>
      </div>

      <div class="mt-6 grid gap-4 xl:grid-cols-2">
        <section class="rounded-2xl border border-stone-200 bg-white">
          <h2 class="border-b border-stone-200 px-5 py-3 text-sm font-semibold text-stone-700">
            Newest flags
          </h2>
          <ul v-if="pendingFlags.length" class="divide-y divide-stone-100">
            <li
              v-for="flag in pendingFlags"
              :key="flag.id"
              class="flex items-center gap-3 px-5 py-3"
            >
              <StatusBadge :value="flag.reason" />
              <span class="flex-1 font-mono text-xs text-stone-500">
                sighting {{ shortId(flag.sighting_id) }}
              </span>
              <span class="text-xs text-stone-400">{{ formatRelative(flag.created_at) }}</span>
            </li>
          </ul>
          <p v-else class="px-5 py-6 text-sm text-stone-500">The queue is empty.</p>
        </section>

        <section class="rounded-2xl border border-stone-200 bg-white">
          <h2 class="border-b border-stone-200 px-5 py-3 text-sm font-semibold text-stone-700">
            Cases waiting on the transfer
          </h2>
          <ul v-if="awaitingPayout.length" class="divide-y divide-stone-100">
            <li
              v-for="pet in awaitingPayout"
              :key="pet.id"
              class="flex items-center gap-3 px-5 py-3"
            >
              <span class="flex-1 truncate text-sm text-stone-800">{{ pet.pet_name }}</span>
              <span class="text-sm text-stone-600">{{ formatBounty(pet.bounty_amount) }}</span>
            </li>
          </ul>
          <p v-else class="px-5 py-6 text-sm text-stone-500">Nothing to pay out.</p>
        </section>
      </div>
    </DataState>
  </div>
</template>
