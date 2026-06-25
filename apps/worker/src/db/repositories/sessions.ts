import type { SessionInsert } from "../types.js";

/**
 * Insert a new session.
 * token_hash must be the SHA-256 of the raw opaque token. The raw token is
 * placed in an HttpOnly cookie by the auth layer; it is never stored here.
 * expires_at is an ISO-8601 UTC string computed by the auth layer.
 */
export async function insertSession(
  db: D1Database,
  data: SessionInsert,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO sessions (token_hash, owner_id, expires_at)
       VALUES (?, ?, ?)`,
    )
    .bind(data.token_hash, data.owner_id, data.expires_at)
    .run();
}

/**
 * Look up a session by its token hash.
 * Returns owner_id and expires_at so the caller can verify expiry and
 * identify the owner. owner_id is used only server-side.
 * Returns null if the token hash does not exist.
 */
export async function findSessionByTokenHash(
  db: D1Database,
  tokenHash: string,
): Promise<{ owner_id: number; expires_at: string } | null> {
  return db
    .prepare(
      `SELECT owner_id, expires_at
       FROM sessions
       WHERE token_hash = ?`,
    )
    .bind(tokenHash)
    .first<{ owner_id: number; expires_at: string }>();
}

/**
 * Delete a session (logout). No-op if the token hash does not exist.
 */
export async function deleteSession(
  db: D1Database,
  tokenHash: string,
): Promise<void> {
  await db
    .prepare(`DELETE FROM sessions WHERE token_hash = ?`)
    .bind(tokenHash)
    .run();
}
