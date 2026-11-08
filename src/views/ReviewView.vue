<script setup lang="ts">
/**
 * The moderation queue.
 *
 * A flag row names the *reporter* and the sighting id, never the photo, so the
 * sighting behind the selected flag is fetched separately: an administrator
 * cannot rule on "Inappropriate_image" without seeing the image.
 *
 * Upholding deducts score from the hunter who submitted the sighting and
 * withdraws that sighting. It does not ban, suspend, or otherwise touch the
 * account — that sanction was withdrawn on 2026-08-20 because it has no
 * representation in the schema, and the deduction replaced it.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { Loader2, RotateCcw, ShieldCheck, ShieldX } from 'lucide-vue-next'
import DataState from '@/components/Common/DataState.vue'
import PageHeader from '@/components/Common/PageHeader.vue'
import Pagination from '@/components/Common/Pagination.vue'
import StatusBadge from '@/components/Common/StatusBadge.vue'
import SightingPanel from '@/components/Review/SightingPanel.vue'
import UpholdDialog from '@/components/Review/UpholdDialog.vue'
import { ApiError, DATABASE_ERROR, isServerFailure } from '@/api/http'
import { fetchSighting, listFlags, reviewFlag, setSightingVerification } from '@/api/admin'
import { useListQuery } from '@/composables/useListQuery'
import { useToastStore } from '@/stores/toast'
import { formatRelative, shortId } from '@/utils/format'
import type { Flag, FlagStatus, Sighting } from '@/types/domain'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const
const FLAG_STATUSES = ['Pending', 'Reviewed_Penalty', 'Dismissed'] as const
const FILTERS: { label: string; value: FlagStatus | null }[] = [
  { label: 'Pending', value: 'Pending' },
  { label: 'Upheld', value: 'Reviewed_Penalty' },
  { label: 'Dismissed', value: 'Dismissed' },
  { label: 'All', value: null },
]

const toasts = useToastStore()

const pageSize = ref<number>(20)

// Page and filter come from the URL. Absent ?status= defaults to 'Pending' —
// the bucket a moderator opens this screen to work.
const { page, status, setPage, setStatus } = useListQuery({
  statuses: FLAG_STATUSES,
  defaultStatus: 'Pending',
})
const offset = computed(() => (page.value - 1) * pageSize.value)

const flags = ref<Flag[]>([])
const total = ref(0)
const loading = ref(true)
const error = ref<string | null>(null)

const selectedId = ref<string | null>(null)
const selected = computed(() => flags.value.find((flag) => flag.id === selectedId.value) ?? null)

const sighting = ref<Sighting | null>(null)
const sightingLoading = ref(false)
const sightingError = ref<string | null>(null)

const upholdOpen = ref(false)
const acting = ref(false)

let loadId = 0

async function loadQueue() {
  const id = ++loadId
  loading.value = true
  error.value = null
  try {
    const data = await listFlags({ limit: pageSize.value, offset: offset.value }, status.value)
    if (id !== loadId) return
    flags.value = data.items
    total.value = data.total
    // Keep a selection only while it is still on screen, so the detail panel
    // can never describe a flag the operator can no longer see in the list.
    if (!flags.value.some((flag) => flag.id === selectedId.value)) {
      selectedId.value = flags.value[0]?.id ?? null
    }
  } catch (cause) {
    if (id !== loadId) return
    error.value = cause instanceof Error ? cause.message : 'Failed to load the queue.'
    flags.value = []
    total.value = 0
  } finally {
    if (id === loadId) loading.value = false
  }
}

async function loadSighting(sightingId: string | null) {
  sighting.value = null
  sightingError.value = null
  if (!sightingId) return
  sightingLoading.value = true
  try {
    sighting.value = await fetchSighting(sightingId)
  } catch (cause) {
    sightingError.value = cause instanceof Error ? cause.message : 'Failed to load the sighting.'
  } finally {
    sightingLoading.value = false
  }
}

async function dismissFlag() {
  const flag = selected.value
  if (!flag) return
  acting.value = true
  try {
    await reviewFlag(flag.id, 'Dismissed')
    toasts.success('Flag dismissed. The sighting stays visible to owners.')
    await loadQueue()
  } catch (cause) {
    reportFailure(cause)
  } finally {
    acting.value = false
  }
}

async function uphold(points: number) {
  const flag = selected.value
  if (!flag) return
  acting.value = true
  try {
    const result = await reviewFlag(flag.id, 'Reviewed_Penalty', points)
    upholdOpen.value = false
    const applied = result.penalty?.points_applied
    toasts.success(
      applied === undefined || result.penalty === null
        ? 'Flag upheld and the sighting withdrawn. No hunter was identified, so no score was deducted.'
        : `Flag upheld: sighting withdrawn, ${applied} point(s) deducted (balance now ${result.penalty.total_score_after}).`,
    )
    await loadQueue()
    await loadSighting(flag.sighting_id)
  } catch (cause) {
    reportFailure(cause)
  } finally {
    acting.value = false
  }
}

/** Moderate the sighting itself, independent of the flag. */
async function moderateSighting(status: 'Verified' | 'Dismissed') {
  const target = sighting.value
  if (!target) return
  acting.value = true
  try {
    sighting.value = await setSightingVerification(target.id, status)
    toasts.success(
      status === 'Dismissed'
        ? 'Sighting withdrawn from every owner timeline and from scoring.'
        : 'Dismissal reversed. The sighting is back on its owner timeline.',
    )
  } catch (cause) {
    reportFailure(cause)
  } finally {
    acting.value = false
  }
}

function reportFailure(cause: unknown) {
  if (cause instanceof ApiError && cause.isConflict) {
    // Action Conflict — another admin got there first.
    toasts.error('This flag has already been moderated. Refreshing the queue.')
    void loadQueue()
    return
  }
  toasts.error(isServerFailure(cause) ? DATABASE_ERROR : (cause as Error).message)
}

watch(() => selected.value?.sighting_id ?? null, loadSighting)
watch([page, status, pageSize], loadQueue)
watch(pageSize, () => { if (page.value !== 1) setPage(1) })
onMounted(loadQueue)
</script>

<template>
  <PageHeader
    title="Reviews"
    subtitle="Review flagged sightings. When you uphold a flag, the sighting is dismissed and the hunter's reputation score takes a hit."
  />

  <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6 xl:flex-row">
    <!-- Queue -->
    <section
      class="flex min-w-0 flex-col rounded-2xl border border-stone-200 bg-white xl:w-[26rem]"
    >
      <div class="flex flex-wrap gap-1.5 border-b border-stone-200 p-3">
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
        <span v-if="!loading && !error" class="ml-auto self-center text-xs text-stone-400">
          {{ total }} in this bucket
        </span>
      </div>

      <DataState
        :loading="loading"
        :error="error"
        :empty="flags.length === 0"
        empty-message="Nothing in this queue."
        skeleton="list"
        @retry="loadQueue"
      >
        <ul class="min-h-0 flex-1 divide-y divide-stone-100 overflow-y-auto">
          <li v-for="flag in flags" :key="flag.id" :data-testid="`flag-${flag.id}`">
            <button
              type="button"
              :class="selectedId === flag.id ? 'bg-orange-50' : 'hover:bg-stone-50'"
              class="w-full cursor-pointer px-4 py-3 text-left transition-colors"
              @click="selectedId = flag.id"
            >
              <div class="flex items-center justify-between gap-2">
                <StatusBadge :value="flag.reason" />
                <span class="text-[11px] text-stone-400">{{
                  formatRelative(flag.created_at)
                }}</span>
              </div>
              <p class="mt-1.5 font-mono text-[11px] text-stone-500">
                sighting {{ shortId(flag.sighting_id) }}
              </p>
              <StatusBadge v-if="flag.status !== 'Pending'" :value="flag.status" class="mt-1.5" />
            </button>
          </li>
        </ul>
      </DataState>

      <div v-if="!error && total > 0" class="flex items-center justify-between gap-3 border-t border-stone-100 px-3 py-2">
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
          :count="flags.length"
          @update:page="setPage"
        />
      </div>
    </section>

    <!-- Detail -->
    <section class="flex min-w-0 flex-1 flex-col rounded-2xl border border-stone-200 bg-white">
      <div
        v-if="!selected"
        class="flex flex-1 items-center justify-center p-10 text-sm text-stone-500"
      >
        Select a flag to review it.
      </div>

      <div v-else class="flex min-h-0 flex-1 flex-col">
        <div
          class="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 p-5"
        >
          <div>
            <h2 class="text-base font-semibold text-stone-900">
              Flagged as {{ selected.reason.replace('_', ' ').toLowerCase() }}
            </h2>
            <p class="mt-0.5 font-mono text-xs text-stone-500">
              flag {{ shortId(selected.id) }} · reporter {{ shortId(selected.reporter_id) }}
            </p>
          </div>
          <StatusBadge :value="selected.status" />
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-5">
          <SightingPanel
            :sighting="sighting"
            :loading="sightingLoading"
            :error="sightingError"
            @retry="loadSighting(selected.sighting_id)"
          />
        </div>

        <footer class="border-t border-stone-200 p-5">
          <div v-if="selected.status === 'Pending'" class="flex flex-wrap gap-2">
            <button
              type="button"
              class="flex cursor-pointer items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
              :disabled="acting"
              @click="upholdOpen = true"
            >
              <ShieldX :size="16" /> Uphold and Penalise User
            </button>
            <button
              type="button"
              class="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100 disabled:opacity-60"
              :disabled="acting"
              @click="dismissFlag"
            >
              <ShieldCheck :size="16" /> Dismiss Flag
            </button>
            <Loader2 v-if="acting" :size="18" class="animate-spin self-center text-stone-400" />
          </div>

          <p v-else class="text-sm text-stone-500">
            This flag was already decided. Its sighting can still be moderated below.
          </p>

          <!-- The sighting's own moderation state, independent of the flag. -->
          <div
            v-if="sighting"
            class="mt-4 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-4"
          >
            <span class="text-xs font-medium text-stone-500">Sighting moderation:</span>
            <StatusBadge :value="sighting.verification_status" />
            <button
              v-if="sighting.verification_status !== 'Dismissed'"
              type="button"
              class="cursor-pointer rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-60"
              :disabled="acting"
              @click="moderateSighting('Dismissed')"
            >
              Dismiss
            </button>
            <button
              v-else
              type="button"
              class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:opacity-60"
              :disabled="acting"
              @click="moderateSighting('Verified')"
            >
              <RotateCcw :size="14" /> Restore
            </button>
          </div>
        </footer>
      </div>
    </section>
  </div>

  <UpholdDialog
    :open="upholdOpen"
    :reason="selected?.reason ?? 'Spam'"
    :busy="acting"
    @confirm="uphold"
    @cancel="upholdOpen = false"
  />
</template>
