/**
 * PKCE (Proof Key for Code Exchange) helpers for the OIDC authorization flow.
 * Uses Web Crypto API, available in Cloudflare Workers.
 */

/** Encode a Uint8Array as a URL-safe base64 string (no padding). */
function base64UrlEncode(buf: Uint8Array): string {
  const b64 = btoa(String.fromCharCode(...buf));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Generate a cryptographically random PKCE code_verifier.
 * 32 random bytes → 43-char URL-safe base64url string.
 */
export function generateCodeVerifier(): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
}

/**
 * Derive the PKCE code_challenge from a code_verifier.
 * Method: S256 — BASE64URL(SHA-256(code_verifier))
 */
export async function deriveCodeChallenge(verifier: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64UrlEncode(new Uint8Array(buf));
}

/**
 * Generate a cryptographically random state or nonce value.
 * 24 random bytes → 32-char URL-safe base64url string.
 */
export function generateRandomParam(): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(24)));
}
