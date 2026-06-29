/** MishiPass public ID format — tooling and Worker layer. */

// Crockford Base32: digits + uppercase letters excluding I, L, O, U.
// Ambiguous characters removed to prevent misreading on printed QR tags.
export const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const ID_PATTERN =
  /^MP-[A-Z]{2}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

const COUNTRY_PATTERN = /^[A-Z]{2}$/;

function randomSegment(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  // 256 / 32 === 8 exactly, so byte % 32 is uniform.
  return Array.from(bytes)
    .map((b) => ALPHABET[b % 32]!)
    .join("");
}

/**
 * Return a new MishiPass ID for the given two-letter country code.
 *
 * countryCode must be exactly 2 ASCII uppercase letters (A-Z). No
 * normalization is applied — lowercase or non-ASCII input throws.
 * The country segment is cosmetic display context only — uniqueness comes
 * entirely from the two random segments.
 */
export function generateId(countryCode: string): string {
  if (!COUNTRY_PATTERN.test(countryCode)) {
    throw new Error(
      `countryCode must be exactly 2 uppercase ASCII letters (A-Z), got ${JSON.stringify(countryCode)}`
    );
  }
  return `MP-${countryCode}-${randomSegment()}-${randomSegment()}`;
}

/** Return true if value strictly matches the MishiPass ID pattern. */
export function validateId(value: string): boolean {
  return ID_PATTERN.test(value);
}

/**
 * Parse a MishiPass ID into its components.
 * Returns { prefix, country, seg1, seg2 }.
 * Throws if value does not match the format contract.
 */
export function parseId(value: string): {
  prefix: string;
  country: string;
  seg1: string;
  seg2: string;
} {
  if (!validateId(value)) {
    throw new Error(`Invalid MishiPass ID: ${JSON.stringify(value)}`);
  }
  const parts = value.split("-");
  return {
    prefix: parts[0]!,
    country: parts[1]!,
    seg1: parts[2]!,
    seg2: parts[3]!,
  };
}
