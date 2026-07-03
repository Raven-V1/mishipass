import type {
  SightingReportInsert,
  SightingReportOwnerView,
} from "../types.js";

/**
 * Insert a public sighting report.
 * This is an unauthenticated path — no ownerId required.
 * cat_id is resolved from catPublicId via a subquery; the internal id is never
 * returned or held in application code. If catPublicId does not exist, the
 * NOT NULL constraint on cat_id causes the insert to fail.
 *
 * IMPORTANT: Upload validation (MIME allow-list, magic-byte check, 5 MB cap,
 * per-IP rate limiting) must be enforced in the route handler BEFORE calling
 * this function. That is a Day-5 task; see spec §6.
 *
 * reporter_ip_hash must be HMAC-SHA256(raw_ip, REPORTER_IP_SECRET) — the raw
 * IP must never reach this layer.
 */
export async function insertSightingReport(
  db: D1Database,
  data: SightingReportInsert,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO sighting_reports (cat_id, message, photo_r2_key, location_text, reporter_ip_hash)
       VALUES (
         (SELECT id FROM cats WHERE public_id = ?),
         ?, ?, ?, ?
       )`,
    )
    .bind(
      data.catPublicId,
      data.message ?? null,
      data.photo_r2_key ?? null,
      data.location_text ?? null,
      data.reporter_ip_hash ?? null,
    )
    .run();
}

/**
 * List sighting reports for the authenticated owner's cat.
 * Ownership enforced via the cat_id subquery.
 * reporter_ip_hash is omitted from the owner view (it is an internal
 * privacy-protection value; the owner never needs to see it).
 */
export async function listSightingReportsForOwner(
  db: D1Database,
  catPublicId: string,
  ownerId: number,
): Promise<SightingReportOwnerView[]> {
  const result = await db
    .prepare(
      `SELECT sr.message, sr.photo_r2_key, sr.location_text, sr.created_at
       FROM sighting_reports sr
       WHERE sr.cat_id = (SELECT id FROM cats WHERE public_id = ? AND owner_id = ?)
       ORDER BY sr.created_at DESC`,
    )
    .bind(catPublicId, ownerId)
    .all<SightingReportOwnerView>();
  return result.results;
}

/**
 * Get a single sighting report by created_at timestamp for an owner's cat.
 * Ownership enforced via the cat_id subquery.
 * Returns null if no such report exists for this owner's cat.
 */
export async function getSightingReportForOwner(
  db: D1Database,
  catPublicId: string,
  ownerId: number,
  createdAt: string,
): Promise<SightingReportOwnerView | null> {
  return db
    .prepare(
      `SELECT sr.message, sr.photo_r2_key, sr.location_text, sr.created_at
       FROM sighting_reports sr
       WHERE sr.cat_id = (SELECT id FROM cats WHERE public_id = ? AND owner_id = ?)
         AND sr.created_at = ?
       LIMIT 1`,
    )
    .bind(catPublicId, ownerId, createdAt)
    .first<SightingReportOwnerView>();
}
