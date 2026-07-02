/**
 * D1 row types and insert payloads for MishiPass.
 *
 * PRIVACY RULE: Internal `id` fields are typed for use within the access layer
 * only. They must never be placed in any HTTP response body or URL.
 * The only external cat identifier is `public_id`.
 *
 * Cartilla types (VetVisitRow, VaccineRow, MedicationRow) are private/owner-only.
 * They must never appear in a public mode response.
 */

// ── Scalar enums ──────────────────────────────────────────────────────────────

export type CatMode =
  | "active"
  | "missing"
  | "vet"
  | "travel"
  | "adoption"
  | "memorial"
  | "celebration";

export type ContactMode = "relay" | "phone" | "none";

export type VetSessionStatus = "active" | "finished" | "expired";

// ── owners ────────────────────────────────────────────────────────────────────

export interface OwnerRow {
  /** @internal Never serialize to any client response. */
  id: number;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface OwnerInsert {
  email: string;
  password_hash: string;
}

// ── sessions ──────────────────────────────────────────────────────────────────

export interface SessionRow {
  /** @internal Never serialize to any client response. */
  id: number;
  token_hash: string;
  /** @internal Internal FK; never expose. Use only server-side for owner auth. */
  owner_id: number;
  created_at: string;
  expires_at: string;
}

export interface SessionInsert {
  token_hash: string;
  owner_id: number;
  expires_at: string;
}

// ── cats ──────────────────────────────────────────────────────────────────────

export interface CatRow {
  /** @internal Never serialize to any client response. */
  id: number;
  public_id: string;
  /** @internal Internal FK; never expose. Use only server-side for ownership checks. */
  owner_id: number;
  name: string;
  country_code: string;
  photo_r2_key: string | null;
  current_mode: CatMode;
  created_at: string;
  updated_at: string;
}

/** Shape returned by public QR-scan lookups. No internal ids, no cartilla. */
export interface CatPublicView {
  public_id: string;
  name: string;
  country_code: string;
  photo_r2_key: string | null;
  current_mode: CatMode;
  sex: string | null;
  birth_date: string | null;
  color_markings: string | null;
  breed_mix: string | null;
  weight: string | null;
}

/** Shape returned for owner-only views. Includes notes (private). */
export interface CatOwnerView extends CatPublicView {
  notes: string | null;
}

export interface CatInsert {
  public_id: string;
  owner_id: number;
  name: string;
  country_code: string;
  photo_r2_key?: string | null;
  current_mode?: CatMode;
  sex?: string | null;
  birth_date?: string | null;
  color_markings?: string | null;
  breed_mix?: string | null;
  weight?: string | null;
  notes?: string | null;
}

// ── contact_settings ──────────────────────────────────────────────────────────

export interface ContactSettingsRow {
  /** @internal Never serialize to any client response. */
  id: number;
  /** @internal Internal FK; never expose. */
  cat_id: number;
  contact_mode: ContactMode;
  public_phone: string | null;
}

/** Shape safe to include in a public mode response. */
export interface ContactSettingsPublicView {
  contact_mode: ContactMode;
  /** Present only when contact_mode === 'phone'. */
  public_phone: string | null;
}

export interface ContactSettingsUpsert {
  contact_mode?: ContactMode;
  public_phone?: string | null;
}

// ── missing_alerts ────────────────────────────────────────────────────────────

export interface MissingAlertRow {
  /** @internal Never serialize to any client response. */
  id: number;
  /** @internal Internal FK; never expose. */
  cat_id: number;
  last_seen_at: string | null;
  city: string | null;
  area: string | null;
  reward_amount: string | null;
  /** SQLite boolean: 0 | 1 */
  reward_visible: 0 | 1;
  /** SQLite boolean: 0 | 1 */
  recovery_board_opt_in: 0 | 1;
  activated_at: string | null;
}

/**
 * Shape safe for a public missing-alert view.
 * reward_amount is null when reward_visible = 0.
 * recovery_board_opt_in is never exposed publicly.
 */
export interface MissingAlertPublicView {
  last_seen_at: string | null;
  city: string | null;
  area: string | null;
  /** null when the owner has hidden the reward */
  reward_amount: string | null;
  activated_at: string | null;
}

/** Entry returned on the public Recovery Board (includes cat identifiers). */
export interface RecoveryBoardEntry {
  public_id: string;
  name: string;
  country_code: string;
  photo_r2_key: string | null;
  city: string | null;
  area: string | null;
  last_seen_at: string | null;
  activated_at: string | null;
}

export interface MissingAlertUpsert {
  last_seen_at?: string | null;
  city?: string | null;
  area?: string | null;
  reward_amount?: string | null;
  reward_visible?: 0 | 1;
  recovery_board_opt_in?: 0 | 1;
  activated_at?: string | null;
}

// ── sighting_reports ──────────────────────────────────────────────────────────

export interface SightingReportRow {
  /** @internal Never serialize to any client response. */
  id: number;
  /** @internal Internal FK; never expose. */
  cat_id: number;
  message: string | null;
  photo_r2_key: string | null;
  location_text: string | null;
  reporter_ip_hash: string | null;
  created_at: string;
}

/** Shape visible to the cat's owner in the sightings inbox. */
export interface SightingReportOwnerView {
  message: string | null;
  photo_r2_key: string | null;
  location_text: string | null;
  created_at: string;
}

export interface SightingReportInsert {
  catPublicId: string;
  message?: string | null;
  photo_r2_key?: string | null;
  location_text?: string | null;
  reporter_ip_hash?: string | null;
}

// ── vet_sessions ──────────────────────────────────────────────────────────────

export interface VetSessionRow {
  /** @internal Never serialize to any client response. */
  id: number;
  /** @internal Internal FK; never expose. */
  cat_id: number;
  token_hash: string | null;
  activated_at: string;
  expires_at: string;
  status: VetSessionStatus;
}

export interface VetSessionInsert {
  catPublicId: string;
  ownerId: number;
  token_hash?: string | null;
  activated_at: string;
  expires_at: string;
  status?: VetSessionStatus;
}

// ── cartilla ─────────────────────────────────────────────────────────────────
// All cartilla types are PRIVATE / owner-dashboard only.
// They must never be used in a public mode response.

export interface VetVisitRow {
  /** @internal Never serialize to any client response. */
  id: number;
  /** @internal Internal FK; never expose. */
  cat_id: number;
  visit_date: string | null;
  vet_or_clinic_name: string | null;
  notes: string | null;
  created_at: string;
}

/** Cartilla entry returned to the authenticated owner. id included for future CRUD. */
export interface VetVisitEntry {
  id: number;
  visit_date: string | null;
  vet_or_clinic_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface VetVisitInsert {
  visit_date?: string | null;
  vet_or_clinic_name?: string | null;
  notes?: string | null;
}

export interface VaccineRow {
  /** @internal Never serialize to any client response. */
  id: number;
  /** @internal Internal FK; never expose. */
  cat_id: number;
  vaccine_name: string;
  date_given: string | null;
  sticker_photo_r2_key: string | null;
  created_at: string;
}

export interface VaccineEntry {
  id: number;
  vaccine_name: string;
  date_given: string | null;
  sticker_photo_r2_key: string | null;
  created_at: string;
}

export interface VaccineInsert {
  vaccine_name: string;
  date_given?: string | null;
  sticker_photo_r2_key?: string | null;
}

export interface MedicationRow {
  /** @internal Never serialize to any client response. */
  id: number;
  /** @internal Internal FK; never expose. */
  cat_id: number;
  medication_name: string;
  dose: string | null;
  duration: string | null;
  start_date: string | null;
  prescriber_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface MedicationEntry {
  id: number;
  medication_name: string;
  dose: string | null;
  duration: string | null;
  start_date: string | null;
  prescriber_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface MedicationInsert {
  medication_name: string;
  dose?: string | null;
  duration?: string | null;
  start_date?: string | null;
  prescriber_name?: string | null;
  notes?: string | null;
}
