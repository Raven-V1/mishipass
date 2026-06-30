import type {
  ContactSettingsPublicView,
  ContactSettingsRow,
  ContactSettingsUpsert,
} from "../types.js";

/**
 * Get contact settings for a public cat profile.
 * Returns contact_mode and public_phone (safe for the public scan response).
 * Returns null if no settings row exists yet (the mode router should treat
 * this as if contact_mode = 'relay').
 */
export async function getContactSettingsPublic(
  db: D1Database,
  catPublicId: string,
): Promise<ContactSettingsPublicView | null> {
  return db
    .prepare(
      `SELECT cs.contact_mode, cs.public_phone
       FROM contact_settings cs
       JOIN cats c ON c.id = cs.cat_id
       WHERE c.public_id = ?`,
    )
    .bind(catPublicId)
    .first<ContactSettingsPublicView>();
}

/**
 * Get full contact settings for the authenticated owner.
 * Ownership enforced via JOIN with cats.owner_id.
 * Returns null if not found or not owned by ownerId.
 */
export async function getContactSettingsForOwner(
  db: D1Database,
  catPublicId: string,
  ownerId: number,
): Promise<Omit<ContactSettingsRow, "id" | "cat_id"> | null> {
  return db
    .prepare(
      `SELECT cs.contact_mode, cs.public_phone
       FROM contact_settings cs
       JOIN cats c ON c.id = cs.cat_id
       WHERE c.public_id = ? AND c.owner_id = ?`,
    )
    .bind(catPublicId, ownerId)
    .first<Omit<ContactSettingsRow, "id" | "cat_id">>();
}

/**
 * Insert or replace contact settings for a cat.
 * Ownership enforced: uses the cat's internal id only if public_id + owner_id match.
 * If the cat does not exist or is not owned by ownerId, the subquery returns
 * NULL and the INSERT fails on the NOT NULL constraint.
 */
export async function upsertContactSettings(
  db: D1Database,
  catPublicId: string,
  ownerId: number,
  data: ContactSettingsUpsert,
): Promise<void> {
  const catIdSubquery = `(SELECT id FROM cats WHERE public_id = ? AND owner_id = ?)`;

  // Use INSERT OR REPLACE to upsert. contact_settings has UNIQUE(cat_id).
  await db
    .prepare(
      `INSERT INTO contact_settings (cat_id, contact_mode, public_phone)
       VALUES (${catIdSubquery}, ?, ?)
       ON CONFLICT(cat_id) DO UPDATE SET
         contact_mode = excluded.contact_mode,
         public_phone = excluded.public_phone`,
    )
    .bind(
      catPublicId,
      ownerId,
      data.contact_mode ?? "relay",
      data.public_phone ?? null,
    )
    .run();
}
