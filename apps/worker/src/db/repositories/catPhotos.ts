/**
 * Cat photo gallery repository.
 *
 * Manages multiple photos per cat with exactly one profile photo enforced
 * in application logic. Raw R2 keys are never exposed to clients.
 */

import { generatePhotoPublicId } from "../../utils/photoId.js";

export interface CatPhotoRow {
  id: number;
  r2_key: string;
  is_profile: number;
  is_public: number;
  created_at: string;
  photo_public_id: string;
}

export interface CatPhotoView {
  /** Opaque photo identifier (internal DB id, used only server-side) */
  photoIndex: number;
  isProfile: boolean;
  createdAt: string;
}

/**
 * List all photos for a cat (owner-authenticated).
 * Ownership must be verified before calling this function.
 */
export async function listCatPhotos(
  db: D1Database,
  publicId: string,
  ownerId: number,
): Promise<CatPhotoRow[]> {
  const result = await db
    .prepare(
      `SELECT cp.id, cp.r2_key, cp.is_profile, cp.is_public, cp.created_at, cp.photo_public_id
       FROM cat_photos cp
       WHERE cp.cat_id = (SELECT id FROM cats WHERE public_id = ? AND owner_id = ?)
       ORDER BY cp.created_at DESC`,
    )
    .bind(publicId, ownerId)
    .all<CatPhotoRow>();
  return result.results;
}

/**
 * Insert a new photo for a cat. If it's the first photo, mark it as profile.
 * Generates an opaque photo_public_id (Crockford Base32, 16 chars) with retry on
 * UNIQUE constraint collision, matching the pattern used for cat public IDs.
 * Returns the new photo's photo_public_id for use in public-facing URLs.
 */
export async function insertCatPhoto(
  db: D1Database,
  publicId: string,
  ownerId: number,
  r2Key: string,
): Promise<string> {
  // Check if any photo exists already
  const existing = await db
    .prepare(
      `SELECT COUNT(*) as cnt FROM cat_photos
       WHERE cat_id = (SELECT id FROM cats WHERE public_id = ? AND owner_id = ?)`,
    )
    .bind(publicId, ownerId)
    .first<{ cnt: number }>();

  const isProfile = (existing?.cnt ?? 0) === 0 ? 1 : 0;

  // Retry on UNIQUE constraint collision (up to 5 attempts)
  for (let attempt = 0; attempt < 5; attempt++) {
    const photoPublicId = generatePhotoPublicId();
    try {
      const result = await db
        .prepare(
          `INSERT INTO cat_photos (cat_id, r2_key, is_profile, photo_public_id)
           VALUES ((SELECT id FROM cats WHERE public_id = ? AND owner_id = ?), ?, ?, ?)`,
        )
        .bind(publicId, ownerId, r2Key, isProfile, photoPublicId)
        .run();

      const photoId = result.meta.last_row_id as number;

      // If this is the first photo (profile), also update cats.photo_r2_key for backward compat
      if (isProfile) {
        await db
          .prepare(`UPDATE cats SET photo_r2_key = ? WHERE public_id = ? AND owner_id = ?`)
          .bind(r2Key, publicId, ownerId)
          .run();
      }

      return photoPublicId;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("UNIQUE") && attempt < 4) continue;
      throw e;
    }
  }

  throw new Error("Could not generate a unique photo_public_id after 5 attempts");
}

/**
 * Set a specific photo as the profile photo for a cat.
 * Clears is_profile on all other photos for this cat, then sets the target.
 * Also updates cats.photo_r2_key for backward compatibility.
 */
export async function setCatProfilePhoto(
  db: D1Database,
  publicId: string,
  ownerId: number,
  photoId: number,
): Promise<boolean> {
  // Verify ownership and get the photo
  const photo = await db
    .prepare(
      `SELECT cp.r2_key FROM cat_photos cp
       WHERE cp.id = ?
         AND cp.cat_id = (SELECT id FROM cats WHERE public_id = ? AND owner_id = ?)`,
    )
    .bind(photoId, publicId, ownerId)
    .first<{ r2_key: string }>();

  if (!photo) return false;

  // Clear all is_profile for this cat
  await db
    .prepare(
      `UPDATE cat_photos SET is_profile = 0
       WHERE cat_id = (SELECT id FROM cats WHERE public_id = ? AND owner_id = ?)`,
    )
    .bind(publicId, ownerId)
    .run();

  // Set the new profile photo
  await db
    .prepare(`UPDATE cat_photos SET is_profile = 1 WHERE id = ?`)
    .bind(photoId)
    .run();

  // Update cats.photo_r2_key
  await db
    .prepare(`UPDATE cats SET photo_r2_key = ? WHERE public_id = ? AND owner_id = ?`)
    .bind(photo.r2_key, publicId, ownerId)
    .run();

  return true;
}

/**
 * Delete a photo from the gallery. If it was the profile photo, promotes
 * the most recent remaining photo to profile. Returns the R2 key of the
 * deleted photo so the caller can clean up storage.
 */
export async function deleteCatPhoto(
  db: D1Database,
  publicId: string,
  ownerId: number,
  photoId: number,
): Promise<string | null> {
  // Verify ownership and get the photo
  const photo = await db
    .prepare(
      `SELECT cp.id, cp.r2_key, cp.is_profile FROM cat_photos cp
       WHERE cp.id = ?
         AND cp.cat_id = (SELECT id FROM cats WHERE public_id = ? AND owner_id = ?)`,
    )
    .bind(photoId, publicId, ownerId)
    .first<CatPhotoRow>();

  if (!photo) return null;

  // Delete the photo
  await db
    .prepare(`DELETE FROM cat_photos WHERE id = ?`)
    .bind(photoId)
    .run();

  // If it was the profile photo, promote the most recent remaining
  if (photo.is_profile) {
    const nextPhoto = await db
      .prepare(
        `SELECT id, r2_key FROM cat_photos
         WHERE cat_id = (SELECT id FROM cats WHERE public_id = ? AND owner_id = ?)
         ORDER BY created_at DESC LIMIT 1`,
      )
      .bind(publicId, ownerId)
      .first<{ id: number; r2_key: string }>();

    if (nextPhoto) {
      await db
        .prepare(`UPDATE cat_photos SET is_profile = 1 WHERE id = ?`)
        .bind(nextPhoto.id)
        .run();
      await db
        .prepare(`UPDATE cats SET photo_r2_key = ? WHERE public_id = ? AND owner_id = ?`)
        .bind(nextPhoto.r2_key, publicId, ownerId)
        .run();
    } else {
      // No photos left
      await db
        .prepare(`UPDATE cats SET photo_r2_key = NULL WHERE public_id = ? AND owner_id = ?`)
        .bind(publicId, ownerId)
        .run();
    }
  }

  return photo.r2_key;
}

/**
 * Get the R2 key for a specific photo by id (for serving).
 * Ownership checked.
 */
export async function getCatPhotoR2Key(
  db: D1Database,
  publicId: string,
  ownerId: number,
  photoId: number,
): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT cp.r2_key FROM cat_photos cp
       WHERE cp.id = ?
         AND cp.cat_id = (SELECT id FROM cats WHERE public_id = ? AND owner_id = ?)`,
    )
    .bind(photoId, publicId, ownerId)
    .first<{ r2_key: string }>();
  return row?.r2_key ?? null;
}


/**
 * Toggle the is_public flag for a specific photo.
 * Ownership verified via cats table join.
 * Returns true if a row was updated, false if not found or not owned.
 */
export async function toggleCatPhotoPublic(
  db: D1Database,
  publicId: string,
  ownerId: number,
  photoId: number,
  isPublic: boolean,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE cat_photos
       SET is_public = ?
       WHERE id = ?
         AND cat_id = (SELECT id FROM cats WHERE public_id = ? AND owner_id = ?)`,
    )
    .bind(isPublic ? 1 : 0, photoId, publicId, ownerId)
    .run();
  return result.meta.changes > 0;
}

/**
 * List photo public IDs that are public for a given cat (no ownership check).
 * Used on the public profile page to display gallery photos.
 * Returns photo_public_id (opaque identifier) instead of internal id.
 */
export async function listPublicCatPhotos(
  db: D1Database,
  publicId: string,
): Promise<Array<{ photo_public_id: string }>> {
  const result = await db
    .prepare(
      `SELECT cp.photo_public_id
       FROM cat_photos cp
       INNER JOIN cats c ON c.id = cp.cat_id
       WHERE c.public_id = ? AND c.deleted_at IS NULL AND cp.is_public = 1 AND cp.photo_public_id IS NOT NULL
       ORDER BY cp.created_at DESC`,
    )
    .bind(publicId)
    .all<{ photo_public_id: string }>();
  return result.results;
}

/**
 * Get the R2 key for a specific photo only if it is marked public.
 * No ownership check -- used for unauthenticated public gallery serving.
 * Looks up by photo_public_id (opaque identifier), not internal id.
 * Returns null if the photo does not exist, belongs to a deleted cat, or is not public.
 */
export async function getPublicCatPhotoR2Key(
  db: D1Database,
  publicId: string,
  photoPublicId: string,
): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT cp.r2_key
       FROM cat_photos cp
       INNER JOIN cats c ON c.id = cp.cat_id
       WHERE cp.photo_public_id = ? AND c.public_id = ? AND c.deleted_at IS NULL AND cp.is_public = 1`,
    )
    .bind(photoPublicId, publicId)
    .first<{ r2_key: string }>();
  return row?.r2_key ?? null;
}
