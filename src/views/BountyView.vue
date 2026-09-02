<script setup lang="ts">
/**
 * Bounty settlement — the administrator's other duty.
 *
 * The owner closes their own case and the clue points are distributed at that
 * moment, possibly days before anyone opens this screen. What is left here is
 * the money: record the transfer against the sighting the owner confirmed as
 * the catch, which moves the report from 'Found' to 'Resolved'.
 *
 * The eligible sightings are therefore filtered to Caught + owner-Confirmed and
 * not dismissed — nominating anything else is a 400 from the backend, and it is
 * better not to offer it at all.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { BadgeCheck, Loader2 } from 'lucide-vue-next'
import ConfirmDialog from '@/components/Common/ConfirmDialog.vue'
import DataState from '@/components/Common/DataState.vue'
import PageHeader from '@/components/Common/PageHeader.vue'
import StatusBadge from '@/components/Common/StatusBadge.vue'
import { fetchSightingTimeline, listMissingPets, settleBounty } from '@/api/admin'
import { useToastStore } from '@/stores/toast'
import { formatBounty, formatDateTime, shortId } from '@/utils/format'
import type { MissingPet, TimelineEntry } from '@/types/domain'

const TIMELINE_PAGE = { limit: 100, offset: 0 }
// Settlement is a short queue by nature — a case only sits here between the
// owner closing it and the transfer being recorded — so it is one page with a
// count rather than a pager. `total` still comes from the server, so an
// unexpectedly long queue announces itself instead of being silently truncated.
const PAGE_SIZE = 50

const toasts = useToastStore()

const pets = ref<MissingPet[]>([])
const total = ref(0)
const loading = ref(true)
const error = ref<string | null>(null)

const selectedId = ref<string | null>(null)
const selected = computed(() => pets.value.find((pet) => pet.id === selectedId.value) ?? null)

const timeline = ref<TimelineEntry[]>([])
const timelineLoading = ref(false)
const timelineError = ref<string | null>(null)

const finalSightingId = ref<string | null>(null)
const slipUrl = ref('')
const referenceNo = ref('')
const confirmOpen = ref(false)
const busy = ref(false)

/** Only the owner-confirmed catch can take the bounty (SRS-86 → resolve). */
const eligible = computed(() =>
  timeline.value.filter(
    (entry) =>
      entry.action_type === 'Caught' &&
      entry.owner_status === 'Confirmed' &&
      entry.verification_status !== 'Dismissed',
  ),
)

const canSubmit = computed(() => Boolean(finalSightingId.value && slipUrl.value.trim()))

async function loadPets() {
  loading.value = true
  error.value = null
  try {
    // 'Found' is the precondition the backend enforces: the pet is home and the
    // owner has closed the case, but the money has not moved yet.
    const page = await listMissingPets({ limit: PAGE_SIZE, offset: 0 }, 'Found')
    pets.value = page.items
    total.value = page.total
    if (!pets.value.some((pet) => pet.id === selectedId.value)) selectedId.value = null
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Failed to load cases.'
    pets.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function loadTimeline(petId: string | null) {
  timeline.value = []
  timelineError.value = null
  finalSightingId.value = null
  if (!petId) return
  timelineLoading.value = true
  try {
    timeline.value = await fetchSightingTimeline(petId, TIMELINE_PAGE)
    finalSightingId.value = eligible.value[0]?.id ?? null
  } catch (cause) {
    timelineError.value = cause instanceof Error ? cause.message : 'Failed to load the timeline.'
  } finally {
    timelineLoading.value = false
  }
}

async function confirmSettlement() {
  const pet = selected.value
  if (!pet || !finalSightingId.value) return
  busy.value = true
  try {
    await settleBounty(pet.id, {
      final_sighting_id: finalSightingId.value,
      slip_image_url: slipUrl.value.trim(),
      reference_no: referenceNo.value.trim() || null,
    })
    toasts.success(`Bounty for "${pet.pet_name}" recorded. The case is now Resolved.`)
    confirmOpen.value = false
    slipUrl.value = ''
    referenceNo.value = ''
    selectedId.value = null
    await loadPets()
  } catch (cause) {
    toasts.error(cause instanceof Error ? cause.message : 'Failed to settle the bounty.')
  } finally {
    busy.value = false
  }
}

watch(selectedId, loadTimeline)
onMounted(loadPets)
</script>

<template>
  <PageHeader
    title="Bounty settlement"
    subtitle="Cases the owner has closed, waiting on the transfer. Ranking points were already paid."
    requirement="Admin duty · POST /admin/missing-pets/{id}/resolve"
  />

  <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6 xl:flex-row">
    <section
      class="flex min-w-0 flex-col rounded-2xl border border-stone-200 bg-white xl:w-[24rem]"
    >
      <h2
        class="flex items-center justify-between border-b border-stone-200 px-4 py-3 text-sm font-semibold text-stone-700"
      >
        Awaiting payout
        <span v-if="!loading && !error" class="text-xs font-normal text-stone-400">
          {{ total > PAGE_SIZE ? `${PAGE_SIZE} of ${total}` : total }}
        </span>
      </h2>
      <DataState
        :loading="loading"
        :error="error"
        :empty="pets.length === 0"
        empty-message="No case is waiting on a bounty transfer."
        skeleton="list"
        :skeleton-rows="4"
        @retry="loadPets"
      >
        <ul class="divide-y divide-stone-100 overflow-y-auto">
          <li v-for="pet in pets" :key="pet.id">
            <button
              type="button"
              :class="selectedId === pet.id ? 'bg-orange-50' : 'hover:bg-stone-50'"
              class="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors"
              @click="selectedId = pet.id"
            >
              <img
                v-if="pet.image_url"
                :src="pet.image_url"
                alt=""
                class="h-10 w-10 rounded-lg border border-stone-200 object-cover"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-stone-800">{{ pet.pet_name }}</p>
                <p class="text-xs text-stone-500">{{ formatBounty(pet.bounty_amount) }}</p>
              </div>
              <StatusBadge :value="pet.status" />
            </button>
          </li>
        </ul>
      </DataState>
    </section>

    <section class="flex min-w-0 flex-1 flex-col rounded-2xl border border-stone-200 bg-white">
      <div
        v-if="!selected"
        class="flex flex-1 items-center justify-center p-10 text-sm text-stone-500"
      >
        Select a case to settle its bounty.
      </div>

      <div v-else class="flex min-h-0 flex-1 flex-col">
        <div class="border-b border-stone-200 p-5">
          <h2 class="text-base font-semibold text-stone-900">{{ selected.pet_name }}</h2>
          <p class="mt-0.5 text-sm text-stone-500">
            {{ formatBounty(selected.bounty_amount) }} · owner {{ shortId(selected.owner_id) }}
          </p>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-5">
          <h3 class="text-sm font-semibold text-stone-700">Who made the catch</h3>
          <p class="mt-0.5 text-xs text-stone-500">
            Only sightings the owner confirmed as "Caught" can take the bounty.
          </p>

          <div v-if="timelineLoading" class="flex items-center gap-2 py-8 text-sm text-stone-500">
            <Loader2 :size="16" class="animate-spin" /> Loading timeline…
          </div>
          <p v-else-if="timelineError" class="py-6 text-sm text-rose-600">{{ timelineError }}</p>
          <p
            v-else-if="eligible.length === 0"
            class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800"
          >
            This case has no owner-confirmed Caught sighting, so the backend will refuse the
            transfer. Check with the owner before paying anything.
          </p>

          <ul v-else class="mt-3 flex flex-col gap-2">
            <li v-for="entry in eligible" :key="entry.id">
              <label
                :class="
                  finalSightingId === entry.id
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-stone-200'
                "
                class="flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors"
              >
                <input
                  v-model="finalSightingId"
                  type="radio"
                  :value="entry.id"
                  name="final-sighting"
                  class="accent-orange-600"
                />
                <img
                  v-if="entry.image_url"
                  :src="entry.image_url"
                  alt=""
                  class="h-12 w-12 rounded-lg border border-stone-200 object-cover"
                />
                <div class="min-w-0 flex-1">
                  <p class="text-sm text-stone-800">
                    {{ entry.hunter_display_name || shortId(entry.hunter_id) }}
                  </p>
                  <p class="text-xs text-stone-500">{{ formatDateTime(entry.created_at) }}</p>
                </div>
                <StatusBadge :value="entry.owner_status" />
              </label>
            </li>
          </ul>

          <h3 class="mt-6 text-sm font-semibold text-stone-700">Transfer proof</h3>
          <label class="mt-2 block text-xs font-medium text-stone-600" for="slip">
            Slip image URL <span class="text-rose-500">*</span>
          </label>
          <input
            id="slip"
            v-model="slipUrl"
            type="url"
            placeholder="https://…/slip.jpg"
            class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          />

          <label class="mt-3 block text-xs font-medium text-stone-600" for="reference">
            Reference number
          </label>
          <input
            id="reference"
            v-model="referenceNo"
            type="text"
            placeholder="Optional, but useful for audit"
            class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          />
        </div>

        <footer class="border-t border-stone-200 p-5">
          <button
            type="button"
            class="flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!canSubmit || busy"
            @click="confirmOpen = true"
          >
            <BadgeCheck :size="16" /> Record transfer and resolve
          </button>
        </footer>
      </div>
    </section>
  </div>

  <ConfirmDialog
    :open="confirmOpen"
    :busy="busy"
    title="Record this bounty transfer?"
    :message="`This marks &quot;${selected?.pet_name ?? ''}&quot; as Resolved and files the slip against the winning sighting. It cannot be recorded twice.`"
    confirm-label="Record transfer"
    @confirm="confirmSettlement"
    @cancel="confirmOpen = false"
  />
</template>
