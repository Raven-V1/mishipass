/**
 * Cartilla repository — vet_visits, vaccines, medications.
 *
 * PRIVACY INVARIANT (spec §3, §4 LOCKED):
 * Every read and write here enforces ownership via:
 *   WHERE cat_id = (SELECT id FROM cats WHERE public_id = ? AND owner_id = ?)
 *
 * If the subquery returns NULL (wrong owner or non-existent cat), inserts fail
 * on the NOT NULL constraint and selects return empty results.
 *
 * Cartilla data must NEVER be joined into a public mode response.
 *
 * medications: documentation only. No reminder, dosage calculation, interaction
 * check, or refill column may be added without a logged re-scope decision.
 */

import type {
  MedicationEntry,
  MedicationInsert,
  VaccineEntry,
  VaccineInsert,
  VetVisitEntry,
  VetVisitInsert,
} from "../types.js";

// ── Shared ownership subquery ─────────────────────────────────────────────────

const OWNED_CAT_ID =
  `(SELECT id FROM cats WHERE public_id = ? AND owner_id = ?)` as const;

// ── vet_visits ────────────────────────────────────────────────────────────────

/**
 * Insert a vet visit record for the authenticated owner's cat.
 * Throws if cat not found or not owned by ownerId.
 */
export async function insertVetVisit(
  db: D1Database,
  catPublicId: string,
  ownerId: number,
  data: VetVisitInsert,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO vet_visits (cat_id, visit_date, vet_or_clinic_name, notes)
       VALUES (${OWNED_CAT_ID}, ?, ?, ?)`,
    )
    .bind(
      catPublicId,
      ownerId,
      data.visit_date ?? null,
      data.vet_or_clinic_name ?? null,
      data.notes ?? null,
    )
    .run();
}

/**
 * List vet visits for the authenticated owner's cat.
 * Ownership enforced in the WHERE clause; returns empty array for non-owners.
 * cat_id is never returned.
 */
export async function listVetVisits(
  db: D1Database,
  catPublicId: string,
  ownerId: number,
): Promise<VetVisitEntry[]> {
  const result = await db
    .prepare(
      `SELECT vv.id, vv.visit_date, vv.vet_or_clinic_name, vv.notes, vv.created_at
       FROM vet_visits vv
       WHERE vv.cat_id = ${OWNED_CAT_ID}
       ORDER BY vv.visit_date DESC, vv.created_at DESC`,
    )
    .bind(catPublicId, ownerId)
    .all<VetVisitEntry>();
  return result.results;
}

// ── vaccines ──────────────────────────────────────────────────────────────────

/**
 * Insert a vaccine record for the authenticated owner's cat.
 * Throws if cat not found or not owned by ownerId.
 */
export async function insertVaccine(
  db: D1Database,
  catPublicId: string,
  ownerId: number,
  data: VaccineInsert,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO vaccines (cat_id, vaccine_name, date_given, sticker_photo_r2_key)
       VALUES (${OWNED_CAT_ID}, ?, ?, ?)`,
    )
    .bind(
      catPublicId,
      ownerId,
      data.vaccine_name,
      data.date_given ?? null,
      data.sticker_photo_r2_key ?? null,
    )
    .run();
}

/**
 * List vaccine records for the authenticated owner's cat.
 * Ownership enforced; cat_id never returned.
 */
export async function listVaccines(
  db: D1Database,
  catPublicId: string,
  ownerId: number,
): Promise<VaccineEntry[]> {
  const result = await db
    .prepare(
      `SELECT v.id, v.vaccine_name, v.date_given, v.sticker_photo_r2_key, v.created_at
       FROM vaccines v
       WHERE v.cat_id = ${OWNED_CAT_ID}
       ORDER BY v.date_given DESC, v.created_at DESC`,
    )
    .bind(catPublicId, ownerId)
    .all<VaccineEntry>();
  return result.results;
}

// ── medications (documentation only) ─────────────────────────────────────────

/**
 * Insert a medication record for the authenticated owner's cat.
 * Medication entries are documentation only (spec §4 LOCKED):
 * records what a vet prescribed, as entered by vet or owner.
 * Throws if cat not found or not owned by ownerId.
 */
export async function insertMedication(
  db: D1Database,
  catPublicId: string,
  ownerId: number,
  data: MedicationInsert,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO medications
         (cat_id, medication_name, dose, duration, start_date, prescriber_name, notes)
       VALUES (${OWNED_CAT_ID}, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      catPublicId,
      ownerId,
      data.medication_name,
      data.dose ?? null,
      data.duration ?? null,
      data.start_date ?? null,
      data.prescriber_name ?? null,
      data.notes ?? null,
    )
    .run();
}

/**
 * List medication records for the authenticated owner's cat.
 * Ownership enforced; cat_id never returned.
 */
export async function listMedications(
  db: D1Database,
  catPublicId: string,
  ownerId: number,
): Promise<MedicationEntry[]> {
  const result = await db
    .prepare(
      `SELECT m.id, m.medication_name, m.dose, m.duration,
              m.start_date, m.prescriber_name, m.notes, m.created_at
       FROM medications m
       WHERE m.cat_id = ${OWNED_CAT_ID}
       ORDER BY m.start_date DESC, m.created_at DESC`,
    )
    .bind(catPublicId, ownerId)
    .all<MedicationEntry>();
  return result.results;
}
