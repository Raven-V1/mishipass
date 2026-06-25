import type { VetSessionInsert, VetSessionRow } from "../types.js";

// TODO (Day 7 — §9 open items q1/q2):
// Before implementing vet session expiry or token enforcement, Carlos must
// decide and log in docs/decision-log.md:
//   q1: Is vet access token-based (hash the token, mirror sessions.token_hash)
//       or purely mode-gated (token_hash nullable, known Beta limitation)?
//   q2: What is the expires_at rule — 24 h from activated_at OR immediate on
//       Save & Finish Visit, whichever comes first?
// Do NOT add expiry logic or token enforcement here until that decision is made.

/**
 * Insert a new vet session for a cat.
 * Ownership enforced: cat_id is resolved via public_id + ownerId subquery.
 * token_hash: if token-based, must be SHA-256 of the raw session token; if
 *   mode-gated, pass null.
 * expires_at: computed by the caller; not enforced here (open item §9 q2).
 */
export async function insertVetSession(
  db: D1Database,
  data: VetSessionInsert,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO vet_sessions (cat_id, token_hash, activated_at, expires_at, status)
       VALUES (
         (SELECT id FROM cats WHERE public_id = ? AND owner_id = ?),
         ?, ?, ?, ?
       )`,
    )
    .bind(
      data.catPublicId,
      data.ownerId,
      data.token_hash ?? null,
      data.activated_at,
      data.expires_at,
      data.status ?? "active",
    )
    .run();
}

/**
 * Find the most recent vet session for a cat.
 * Does NOT enforce expiry — checking expires_at vs. current time is the
 * route handler's responsibility (open item §9 q2).
 * Returns null if no session exists.
 */
export async function findLatestVetSession(
  db: D1Database,
  catPublicId: string,
): Promise<Omit<VetSessionRow, "id" | "cat_id"> | null> {
  return db
    .prepare(
      `SELECT vs.token_hash, vs.activated_at, vs.expires_at, vs.status
       FROM vet_sessions vs
       JOIN cats c ON c.id = vs.cat_id
       WHERE c.public_id = ?
       ORDER BY vs.activated_at DESC
       LIMIT 1`,
    )
    .bind(catPublicId)
    .first<Omit<VetSessionRow, "id" | "cat_id">>();
}

/**
 * Mark a vet session as finished (Save & Finish Visit).
 * Ownership enforced via the cat join.
 * Returns true if a row was updated.
 */
export async function finishVetSession(
  db: D1Database,
  catPublicId: string,
  ownerId: number,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE vet_sessions
       SET status = 'finished'
       WHERE cat_id = (SELECT id FROM cats WHERE public_id = ? AND owner_id = ?)
         AND status = 'active'`,
    )
    .bind(catPublicId, ownerId)
    .run();
  return result.meta.changes > 0;
}
