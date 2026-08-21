/**
 * The admin surface of FastAPI, one function per route.
 *
 * Scope note (decided 2026-08-20, narrowed 2026-08-21 — see
 * `services/admin_service.py`): an administrator moderates and settles money.
 * They do NOT adjudicate whether a photograph shows a particular pet — the
 * owner does that — and they do not suspend or ban accounts. The sanction for
 * an upheld flag is a score deduction. There is intentionally no user-account
 * endpoint for this console to call.
 */
import { request } from './http'
import type {
  Flag,
  FlagDecision,
  FlagStatus,
  MissingPet,
  Paginated,
  PetSpecies,
  PetStatus,
  ReviewFlagResult,
  Sighting,
  TimelineEntry,
  VerificationStatus,
} from '@/types/domain'

export interface Page {
  limit: number
  offset: number
}

/**
 * SRS-64 / UD-14 step 1 — browse every report on the platform.
 *
 * The backend counts the rows matching `status` and returns that count with
 * the page, so paging here is server-side in both directions: the window is
 * asked for, and how many windows there are comes back.
 */
export function listMissingPets(
  page: Page,
  // 'Spotted' is a derived filter handled server-side (not a raw DB column value).
  status?: PetStatus | 'Spotted' | null,
  species?: PetSpecies | null,
): Promise<Paginated<MissingPet>> {
  return request<Paginated<MissingPet>>('/admin/missing-pets', {
    query: { limit: page.limit, offset: page.offset, status, species },
  })
}

/** Fetch a specific missing pet report */
export function fetchMissingPet(petId: string): Promise<MissingPet> {
  return request<MissingPet>(`/admin/missing-pets/${petId}`)
}

/**
 * SRS-66 / UD-14 step 7 — remove a report that breaks the guidelines.
 *
 * A hard delete: UD-14's postcondition is "removed from the database and the
 * search map", and the backend cascades to `sighting_matches`. There is no undo.
 */
export function removeMissingPet(petId: string): Promise<MissingPet> {
  return request<MissingPet>(`/admin/missing-pets/${petId}`, { method: 'DELETE' })
}

/** SRS-63 / UD-13 — the full timeline, Dismissed entries included. */
export function fetchSightingTimeline(petId: string, page: Page): Promise<TimelineEntry[]> {
  return request<TimelineEntry[]>(`/admin/missing-pets/${petId}/sighting-timeline`, {
    query: { limit: page.limit, offset: page.offset },
  })
}

/**
 * SRS-67 — the moderation queue. `status` omitted means every status.
 *
 * `total` is the depth of the queue for that filter, which is the number a
 * moderator actually works against.
 */
export function listFlags(page: Page, status?: FlagStatus | null): Promise<Paginated<Flag>> {
  return request<Paginated<Flag>>('/admin/reports', {
    query: { limit: page.limit, offset: page.offset, status },
  })
}

/**
 * SRS-68 / UD-14 — decide a flag.
 *
 * Upholding dismisses the flagged sighting and deducts score from the hunter
 * who submitted it; `penaltyPoints` overrides the per-reason default and 0
 * withdraws the sighting without charging anything. Nobody is banned.
 * A flag another administrator already decided comes back as 409 ([E1]).
 */
export function reviewFlag(
  flagId: string,
  decision: FlagDecision,
  penaltyPoints?: number | null,
): Promise<ReviewFlagResult> {
  return request<ReviewFlagResult>(`/admin/reports/${flagId}`, {
    method: 'PATCH',
    body: {
      decision,
      ...(decision === 'Reviewed_Penalty' && penaltyPoints !== null && penaltyPoints !== undefined
        ? { penalty_points: penaltyPoints }
        : {}),
    },
  })
}

/**
 * SRS-82 / UD-19 — withdraw a sighting, or reverse that withdrawal.
 *
 * 'Dismissed' pulls it from every owner timeline and out of scoring;
 * 'Verified' is only how a dismissal is undone. Neither awards nor withdraws
 * ranking points — the owner's confirmation is what moves points (SRS-90).
 */
export function setSightingVerification(
  sightingId: string,
  status: Extract<VerificationStatus, 'Verified' | 'Dismissed'>,
): Promise<Sighting> {
  return request<Sighting>(`/admin/sightings/${sightingId}/verification`, {
    method: 'PATCH',
    body: { verification_status: status },
  })
}

/** The sighting behind a flag — the queue row names the reporter, not the photo. */
export function fetchSighting(sightingId: string): Promise<Sighting> {
  return request<Sighting>(`/sightings/${sightingId}`)
}

export interface SettleBountyInput {
  final_sighting_id: string
  slip_image_url: string
  reference_no?: string | null
}

/**
 * Settle the bounty on a case the OWNER has already closed.
 *
 * Precondition is `status = 'Found'`; the nominated sighting must be the
 * owner-confirmed Caught one. Awards no points — those were distributed when
 * the owner confirmed the rescue, possibly days earlier. 400 on every
 * violation of that sequence.
 */
export function settleBounty(petId: string, input: SettleBountyInput): Promise<unknown> {
  return request(`/admin/missing-pets/${petId}/resolve`, { method: 'POST', body: input })
}
