/**
 * Cat photo gallery repository.
 *
 * Manages multiple photos per cat with exactly one profile photo enforced
 * in application logic. Raw R2 keys are never exposed to clients.
 */

export interface CatPhotoRow {
  id: number;
  r2_key: string;
  is_profile: number;
  created_at: string;
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
      `SELECT cp.id, cp.r2_key, cp.is_profile, cp.created_at
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
 * Returns the new photo's internal id (used for subsequent operations).
 */
export async function insertCatPhoto(
  db: D1Database,
  publicId: string,
  ownerId: number,
  r2Key: string,
): Promise<number> {
  // Check if any photo exists already
  const existing = await db
    .prepare(
      `SELECT COUNT(*) as cnt FROM cat_photos
       WHERE cat_id = (SELECT id FROM cats WHERE public_id = ? AND owner_id = ?)`,
    )
    .bind(publicId, ownerId)
    .first<{ cnt: number }>();

  const isProfile = (existing?.cnt ?? 0) === 0 ? 1 : 0;

  const result = await db
    .prepare(
      `INSERT INTO cat_photos (cat_id, r2_key, is_profile)
       VALUES ((SELECT id FROM cats WHERE public_id = ? AND owner_id = ?), ?, ?)`,
    )
    .bind(publicId, ownerId, r2Key, isProfile)
    .run();

  const photoId = result.meta.last_row_id as number;

  // If this is the first photo (profile), also update cats.photo_r2_key for backward compat
  if (isProfile) {
    await db
      .prepare(`UPDATE cats SET photo_r2_key = ? WHERE public_id = ? AND owner_id = ?`)
      .bind(r2Key, publicId, ownerId)
      .run();
  }

  return photoId;
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
