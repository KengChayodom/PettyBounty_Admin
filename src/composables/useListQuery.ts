/**
 * List state that lives in the URL rather than in a component.
 *
 * The page and the filter belong in the address bar: an administrator who is
 * on page 4 of the flag queue and reloads, or sends the link to a colleague,
 * should land back on page 4 of the flag queue. Holding them in `ref`s instead
 * would lose both on every refresh and make the browser's back button skip the
 * whole table.
 *
 * `replace` rather than `push`: paging through a table should not bury the
 * screen the operator arrived from under twenty history entries.
 */
import { computed } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'

export function useListQuery<S extends string>(options: {
  /** Values `?status=` is allowed to take; anything else is treated as absent. */
  statuses: readonly S[]
  /**
   * When `?status=` is absent from the URL, return this value instead of null.
   * When set, `setStatus(null)` writes `?status=all` so that "absent" and "no
   * filter" stay distinct — the view never needs to know about this token.
   */
  defaultStatus?: S
}) {
  const route = useRoute()
  const router = useRouter()

  const page = computed(() => {
    const raw = Number(route.query.page)
    // A hand-edited or stale `?page=` must not produce a negative offset.
    return Number.isInteger(raw) && raw >= 1 ? raw : 1
  })

  const status = computed<S | null>(() => {
    const raw = route.query.status
    if (typeof raw !== 'string') return options.defaultStatus ?? null
    // 'all' is the URL token for "no filter" when a defaultStatus is in use,
    // so that absent and "show everything" remain distinguishable.
    if (raw === 'all' && options.defaultStatus !== undefined) return null
    return (options.statuses as readonly string[]).includes(raw)
      ? (raw as S)
      : (options.defaultStatus ?? null)
  })

  function apply(next: LocationQueryRaw) {
    void router.replace({ query: { ...route.query, ...next } })
  }

  function setPage(value: number) {
    // Page 1 is the default, so it is left out of the URL entirely.
    apply({ page: value <= 1 ? undefined : String(value) })
  }

  /** Changing the filter returns to page 1 — page 4 of a different filter is a
   *  different set of rows, and landing on an empty page reads as a failure. */
  function setStatus(value: S | null) {
    if (value === null && options.defaultStatus !== undefined) {
      // When absent already means something (defaultStatus), an explicit token
      // is required so the URL can express "no filter at all".
      apply({ status: 'all', page: undefined })
    } else {
      apply({ status: value ?? undefined, page: undefined })
    }
  }

  return { page, status, setPage, setStatus }
}
