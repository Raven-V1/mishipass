import type { OwnerInsert } from "../types.js";

/**
 * Insert a new owner.
 * email must be pre-lowercased by the caller before insert.
 * password_hash must be a PBKDF2-derived string produced by the auth layer.
 * Throws on duplicate email (UNIQUE constraint — caller handles the error).
 */
export async function insertOwner(
  db: D1Database,
  data: OwnerInsert,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO owners (email, password_hash)
       VALUES (?, ?)`,
    )
    .bind(data.email, data.password_hash)
    .run();
}

/**
 * Find an owner by email for authentication.
 * Returns id, email, and password_hash so the auth layer can verify the
 * supplied password. The internal id is used only server-side to create a
 * session; it must never appear in a response body.
 * Returns null if no owner with that email exists.
 */
export async function findOwnerByEmail(
  db: D1Database,
  email: string,
): Promise<{ id: number; email: string; password_hash: string } | null> {
  return db
    .prepare(
      `SELECT id, email, password_hash
       FROM owners
       WHERE email = ?`,
    )
    .bind(email)
    .first<{ id: number; email: string; password_hash: string }>();
}
