import { findSessionByTokenHash } from "../db/index.js";
import { sha256Hex } from "../utils/crypto.js";

export interface RequestContext {
  /** Internal owner ID, attached if the session cookie is valid. Never expose in responses. */
  ownerId: number | null;
}

export function parseCookieValue(header: string, name: string): string | null {
  for (const pair of header.split(";")) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) continue;
    const key = pair.slice(0, eqIdx).trim();
    const val = pair.slice(eqIdx + 1).trim();
    if (key === name) {
      try {
        return decodeURIComponent(val);
      } catch {
        // Malformed percent-encoding — treat as missing cookie.
        return null;
      }
    }
  }
  return null;
}

/**
 * Read the session cookie, hash it, and look it up in D1.
 * Returns { ownerId } — null if cookie is absent, invalid, or expired.
 * The raw token never touches the database; only its SHA-256 hash is stored.
 */
export async function resolveSession(
  request: Request,
  db: D1Database,
): Promise<RequestContext> {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  const token = parseCookieValue(cookieHeader, "session");
  if (!token) return { ownerId: null };

  // Defense-in-depth: reject oversized tokens without hashing.
  if (token.length > 256) return { ownerId: null };

  const tokenHash = await sha256Hex(token);
  const session = await findSessionByTokenHash(db, tokenHash);
  if (!session) return { ownerId: null };

  if (new Date(session.expires_at) <= new Date()) return { ownerId: null };

  return { ownerId: session.owner_id };
}
