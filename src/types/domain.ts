/**
 * Row shapes returned by the FastAPI admin surface.
 *
 * These mirror the PostgreSQL enums in `Petty_Bounty_Backend/sql-update.txt`
 * (lines 6-15) — keep them in step with that file, not with what a given
 * endpoint happens to return today.
 */

/**
 * The `data` payload of a listing endpoint.
 *
 * `total` is the count of rows matching the filter, independent of the window
 * asked for, which is what numbered pages are drawn from — a full page is not
 * evidence that another page exists. `limit`/`offset` are echoed back so a
 * response that arrives after the operator has moved on can be recognised as
 * stale rather than rendered as the page they are looking at.
 */
export interface Paginated<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

export type UserRole = 'user' | 'admin'
export type PetSpecies = 'Cat' | 'Dog' | 'Bird' | 'Other'
export type PetStatus = 'Searching' | 'Spotted' | 'Found' | 'Resolved'
export type ActionType = 'Spotted' | 'Caught'
export type VerificationStatus = 'Pending' | 'Verified' | 'Dismissed'
export type OwnerDecision = 'Pending' | 'Confirmed' | 'Rejected'
export type FlagReason = 'Spam' | 'Not_a_pet' | 'Inappropriate_image'
export type FlagStatus = 'Pending' | 'Reviewed_Penalty' | 'Dismissed'

/** The two terminal states an administrator can write onto a flag. */
export type FlagDecision = 'Dismissed' | 'Reviewed_Penalty'

export interface UserProfile {
  id: string
  display_name: string
  phone: string | null
  role: UserRole
  total_score: number
  profile_image_url: string | null
  created_at: string
}

export interface MissingPet {
  id: string
  owner_id: string
  pet_name: string
  species: PetSpecies
  characteristics: unknown
  bounty_amount: number | string
  last_seen_time: string
  last_seen_location: string
  image_url: string
  /** Raw DB column: Searching | Found | Resolved.
   *  "Spotted" is derived in the template from sighting_count > 0. */
  status: PetStatus
  /** Count of valid sightings; provided by attach_sighting_counts() on the
   *  backend. Used to derive the "Spotted" badge when status is Searching. */
  sighting_count?: number
  created_at: string
  primary_color_hex?: string | null
}

/**
 * One row of `sightings_for_pet` — the admin variant is called with
 * `p_include_dismissed = true`, so Dismissed entries are present here and
 * absent from the owner's copy of the same timeline.
 */
export interface TimelineEntry {
  id: string
  hunter_id: string
  hunter_display_name: string | null
  image_url: string | null
  detected_species: PetSpecies | null
  action_type: ActionType
  sighting_status: string
  verification_status: VerificationStatus
  owner_status: OwnerDecision | null
  sighted_location: string | null
  created_at: string
  similarity_score: number | string | null
  match_source: 'matched' | 'targeted' | 'both'
}

/** A `sightings` row as returned by GET /sightings/{id} (vector stripped). */
export interface Sighting {
  id: string
  hunter_id: string
  image_url: string | null
  detected_species: PetSpecies | null
  action_type: ActionType
  sighting_status: string
  verification_status: VerificationStatus
  sighted_location: string | null
  initial_target_pet_id: string | null
  created_at: string
}

/** A row of the `reports` moderation queue (sql-update.txt:88). */
export interface Flag {
  id: string
  reporter_id: string | null
  sighting_id: string | null
  reason: FlagReason
  status: FlagStatus
  created_at: string
}

/** What `apply_score_penalty` hands back through PATCH /admin/reports/{id}. */
export interface PenaltyResult {
  already_applied: boolean
  penalty_id?: string
  points: number
  points_applied: number
  total_score_after: number
}

export interface ReviewFlagResult {
  report: Flag
  sighting_dismissed: boolean
  penalty: PenaltyResult | null
}

/**
 * Default deduction per flag reason — UD-16's Input Specification, mirrored
 * from `moderation_logic.PENALTY_POINTS_BY_REASON`. Shown as the pre-filled
 * value in the uphold dialog; the administrator may override it within 0-100.
 */
export const DEFAULT_PENALTY_BY_REASON: Record<FlagReason, number> = {
  Spam: 5,
  Not_a_pet: 10,
  Inappropriate_image: 20,
}

export const MAX_PENALTY_POINTS = 100

export const FLAG_REASON_LABEL: Record<FlagReason, string> = {
  Spam: 'Spam',
  Not_a_pet: 'Not a pet',
  Inappropriate_image: 'Inappropriate image',
}

// ── Role management ─────────────────────────────────────────

/** GET /admin/users/lookup — one account at a time, by exact email. */
export interface AccountLookup {
  id: string
  display_name: string
  role: UserRole
}

/** PATCH /admin/users/{id}/role — the result of a role assignment attempt. */
export interface RoleAssignmentResult {
  changed: boolean
  /** Present only when `changed` is true — the audit row id. */
  role_change_id?: string
  id: string
  display_name: string
  role_before: UserRole
  role_after: UserRole
}

/** One row of GET /admin/role-changes. */
export interface RoleChange {
  id: string
  target_user_id: string
  /** Null when the admin who made this change has since been deleted. */
  changed_by: string | null
  role_before: UserRole
  role_after: UserRole
  created_at: string
}
