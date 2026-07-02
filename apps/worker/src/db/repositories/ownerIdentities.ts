import type { OwnerIdentityInsert, OwnerIdentityRow } from "../types.js";

/**
 * Find an owner identity by provider and stable subject identifier.
 * Returns the mapping row (including owner_id) or null if not found.
 * owner_id is used only server-side; never serialize to any response.
 */
export async function findOwnerIdentity(
  db: D1Database,
  provider: string,
  providerSub: string,
): Promise<Pick<OwnerIdentityRow, "owner_id" | "email"> | null> {
  return db
    .prepare(
      `SELECT owner_id, email
       FROM owner_identities
       WHERE provider = ? AND provider_sub = ?`,
    )
    .bind(provider, providerSub)
    .first<Pick<OwnerIdentityRow, "owner_id" | "email">>();
}

/**
 * Insert a new owner identity mapping.
 * Throws on UNIQUE(provider, provider_sub) collision — caller handles retry.
 */
export async function insertOwnerIdentity(
  db: D1Database,
  data: OwnerIdentityInsert,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO owner_identities (owner_id, provider, provider_sub, email)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(data.owner_id, data.provider, data.provider_sub, data.email ?? null)
    .run();
}

/**
 * Update the email stored on an existing identity mapping.
 * Called on every successful login in case the provider email changed.
 */
export async function updateOwnerIdentityEmail(
  db: D1Database,
  provider: string,
  providerSub: string,
  email: string | null,
): Promise<void> {
  await db
    .prepare(
      `UPDATE owner_identities SET email = ? WHERE provider = ? AND provider_sub = ?`,
    )
    .bind(email, provider, providerSub)
    .run();
}

/**
 * Insert an owner row for an OIDC-only user (no password).
 * Sentinel '!' in password_hash: verifyPassword() safely returns false
 * because it does not match the $pbkdf2-sha256$ prefix.
 * Throws on UNIQUE(email) collision — caller handles it as a linking case.
 */
export async function insertOwnerForOidc(
  db: D1Database,
  email: string,
): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO owners (email, password_hash) VALUES (?, '!')
       RETURNING id`,
    )
    .bind(email)
    .first<{ id: number }>();
  if (!result) throw new Error("insertOwnerForOidc: no id returned");
  return result.id;
}
