/**
 * Shared cryptographic utilities for MishiPass auth layer.
 *
 * Uses Web Crypto API (available in Cloudflare Workers).
 * PBKDF2-SHA256 for password hashing; SHA-256 for session token hashing.
 */

/**
 * Compute the hex-encoded SHA-256 digest of the given string.
 */
export async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Hash a password with PBKDF2-SHA256.
 *
 * Returns the PHC-style string:
 *   $pbkdf2-sha256$600000$<base64-salt>$<base64-hash>
 *
 * Salt: 16 random bytes. Iterations: 600000. Derived key: 32 bytes.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 600_000;

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256, // 32 bytes
  );

  const saltB64 = btoa(String.fromCharCode(...salt));
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(derived)));

  return `$pbkdf2-sha256$${iterations}$${saltB64}$${hashB64}`;
}

/**
 * Verify a password against a stored PHC-style PBKDF2-SHA256 hash.
 *
 * Returns true if the password matches, false otherwise.
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  // Parse: $pbkdf2-sha256$<iterations>$<base64-salt>$<base64-hash>
  const parts = stored.split("$");
  // parts[0] is empty (leading $), parts[1] is "pbkdf2-sha256",
  // parts[2] is iterations, parts[3] is salt, parts[4] is hash
  if (parts.length !== 5 || parts[1] !== "pbkdf2-sha256") {
    return false;
  }

  const iterations = parseInt(parts[2]!, 10);
  if (isNaN(iterations)) return false;

  const salt = Uint8Array.from(atob(parts[3]!), (c) => c.charCodeAt(0));
  const expectedHash = Uint8Array.from(atob(parts[4]!), (c) => c.charCodeAt(0));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );

  const derivedBytes = new Uint8Array(derived);

  // Constant-time comparison
  if (derivedBytes.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < derivedBytes.length; i++) {
    diff |= derivedBytes[i]! ^ expectedHash[i]!;
  }
  return diff === 0;
}
