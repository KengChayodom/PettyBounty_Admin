/**
 * The admin surface of FastAPI, one function per route.
 *
 * Scope note (decided 2026-08-20, narrowed 2026-08-21, widened 2026-09-02 —
 * see `services/admin_service.py`): an administrator moderates, settles money,
 * and grants or revokes console access (SRS-93–98). They do NOT adjudicate
 * whether a photograph shows a particular pet — the owner does that — and they
 * do not suspend, ban, or delete accounts. The sanction for an upheld flag is
 * a score deduction. There is no endpoint that lists or searches user accounts;
 * role lookup is by exact email, one account at a time.
 */
import { request } from './http'
import type {
  AccountLookup,
  Flag,
  FlagDecision,
  FlagStatus,
  MissingPet,
  Paginated,
  PetSpecies,
  PetStatus,
  ReviewFlagResult,
  RoleAssignmentResult,
  RoleChange,
  Sighting,
  TimelineEntry,
  UserRole,
  VerificationStatus,
} from '@/types/domain'

export interface Page {
  limit: number
  offset: number
}

/**
 * SRS-70 / UD-14 step 1 — browse every report on the platform.
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
 * SRS-69 / UD-14 step 2 — remove a report that breaks the guidelines.
 *
 * A hard delete: UD-14's postcondition is "removed from the database and the
 * search map", and the backend cascades to `sighting_matches`. There is no undo.
 */
export function removeMissingPet(petId: string): Promise<MissingPet> {
  return request<MissingPet>(`/admin/missing-pets/${petId}`, { method: 'DELETE' })
}

/** SRS-68 / UD-13 — the full timeline, Dismissed entries included. */
export function fetchSightingTimeline(petId: string, page: Page): Promise<TimelineEntry[]> {
  return request<TimelineEntry[]>(`/admin/missing-pets/${petId}/sighting-timeline`, {
    query: { limit: page.limit, offset: page.offset },
  })
}

/**
 * SRS-71 — the moderation queue. `status` omitted means every status.
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
 * SRS-72 / UD-16 — decide a flag.
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
 * SRS-81 / UD-16 — withdraw a sighting, or reverse that withdrawal.
 *
 * 'Dismissed' pulls it from every owner timeline and out of scoring;
 * 'Verified' is only how a dismissal is undone. Neither awards nor withdraws
 * ranking points — the owner's confirmation is what moves points (SRS-89).
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

// ── Bounty rulings (Feature 6) ─────────────────────────────────────────

/** What brought a case to the queue. */
export type BountyQueueKind = 'disputed' | 'unconfirmed' | 'unpaid' | 'rejected_unpaid'

/** One case the owner and the returning hunter could not settle themselves. */
export interface BountyQueueEntry {
  kind: BountyQueueKind
  /** Set for `disputed` and `unconfirmed`; null for the two unpaid kinds. */
  payment_id: string | null
  pet_id: string
  pet_name: string
  owner_id: string
  hunter_id: string | null
  amount: number | string
  slip_image_url: string | null
  reference_no: string | null
  /** When the case reached the queue; the list is oldest first. */
  since: string
}

/** SRS-110: disputed payments, payments unconfirmed past the dispute window,
 * reports referred as unpaid, and rejections not paid again. */
export function listBountyQueue(): Promise<BountyQueueEntry[]> {
  return request<BountyQueueEntry[]>('/admin/bounty-queue')
}

/** SRS-111: confirm (the report becomes Resolved) or reject (the owner pays again). */
export function ruleBountyPayment(paymentId: string, decision: 'Confirm' | 'Reject'): Promise<unknown> {
  return request(`/admin/bounty-payments/${paymentId}/ruling`, {
    method: 'POST',
    body: { decision },
  })
}

/** SRS-112: close an unpaid report as Resolved, recording that the bounty was not paid. */
export function closeBountyUnpaid(petId: string): Promise<unknown> {
  return request(`/admin/missing-pets/${petId}/close-unpaid`, { method: 'POST' })
}

// ── Role management (SRS-93–98) ─────────────────────────────────────────

/**
 * SRS-93 / UD-23 step 1 — find one account by its exact email address.
 *
 * There is no listing or search of all user accounts; the administrator must
 * know who they are looking for. The admin set below is the only listing.
 */
export function findUserByEmail(email: string): Promise<AccountLookup> {
  return request<AccountLookup>('/admin/users/lookup', { query: { email } })
}

/** Every account currently holding the admin role (always a small set). */
export function listAdmins(): Promise<AccountLookup[]> {
  return request<AccountLookup[]>('/admin/users/admins')
}

/**
 * SRS-95 / UD-23 step 4 — grant or revoke administrator access.
 *
 * 409 when the operator tries to drop their own access or would remove the
 * last administrator. `changed: false` when the role is already the one
 * requested — this is not an error and produces no audit row.
 */
export function assignUserRole(
  targetUserId: string,
  role: UserRole,
): Promise<RoleAssignmentResult> {
  return request<RoleAssignmentResult>(`/admin/users/${targetUserId}/role`, {
    method: 'PATCH',
    body: { role },
  })
}

/** SRS-97 — paginated audit trail of every role change. */
export function listRoleChanges(
  page: Page,
  targetUserId?: string | null,
): Promise<Paginated<RoleChange>> {
  return request<Paginated<RoleChange>>('/admin/role-changes', {
    query: { limit: page.limit, offset: page.offset, target_user_id: targetUserId },
  })
}
