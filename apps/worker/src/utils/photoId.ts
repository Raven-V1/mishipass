/**
 * Generates an opaque public identifier for cat photos.
 *
 * Uses the same Crockford Base32 alphabet as cat public IDs (excludes I, L, O, U
 * to avoid visual ambiguity). 16 characters = ~80 bits of entropy.
 *
 * This replaces the sequential integer PK (cat_photos.id) on all public-facing
 * surfaces to satisfy the "no internal PK in any client response" control.
 */

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generatePhotoPublicId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => ALPHABET[b % 32]!)
    .join("");
}

/** Validate that a string matches the expected photo_public_id format: 16 Crockford Base32 chars. */
export const PHOTO_PUBLIC_ID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{16}$/;

export function validatePhotoPublicId(value: string): boolean {
  return PHOTO_PUBLIC_ID_PATTERN.test(value);
}
