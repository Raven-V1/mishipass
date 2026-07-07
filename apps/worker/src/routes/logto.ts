/**
 * Logto OIDC route handlers — Google and Apple social login.
 *
 * Flow: Authorization Code + PKCE (S256), server-side only.
 * No OAuth tokens are placed in client-visible HTML or JavaScript.
 * On success, a standard MishiPass HttpOnly session cookie is issued.
 *
 * Routes:
 *   GET /api/auth/logto/google   — start Google direct sign-in
 *   GET /api/auth/logto/apple    — start Apple direct sign-in
 *   GET /api/auth/logto/callback — token exchange and session creation
 */

import {
  findOwnerByEmail,
  findOwnerIdentity,
  insertOwnerForOidc,
  insertOwnerIdentity,
  insertSession,
  updateOwnerIdentityEmail,
} from "../db/index.js";
import { sha256Hex } from "../utils/crypto.js";
import {
  deriveCodeChallenge,
  generateCodeVerifier,
  generateRandomParam,
} from "../utils/pkce.js";

// ── Configuration ─────────────────────────────────────────────────────────────

export interface LogtoEnv {
  /** Full Logto tenant URL, e.g. https://your-tenant.logto.app */
  LOGTO_ENDPOINT?: string;
  /** Logto application client ID */
  LOGTO_APP_ID?: string;
  /** Logto application client secret (Worker secret, never committed) */
  LOGTO_CLIENT_SECRET?: string;
  /** Absolute redirect URI registered in the Logto app, e.g. https://…/api/auth/logto/callback */
  LOGTO_REDIRECT_URI?: string;
  /** Logto connector target for Google, e.g. "google" */
  LOGTO_GOOGLE_CONNECTOR_TARGET?: string;
  /** Logto connector target for Apple, e.g. "apple" */
  LOGTO_APPLE_CONNECTOR_TARGET?: string;
}

interface LogtoConfig {
  endpoint: string;
  appId: string;
  clientSecret: string;
  redirectUri: string;
}

function getConfig(env: LogtoEnv): LogtoConfig | null {
  const { LOGTO_ENDPOINT, LOGTO_APP_ID, LOGTO_CLIENT_SECRET, LOGTO_REDIRECT_URI } = env;
  if (!LOGTO_ENDPOINT || !LOGTO_APP_ID || !LOGTO_CLIENT_SECRET || !LOGTO_REDIRECT_URI) {
    return null;
  }
  return {
    endpoint: LOGTO_ENDPOINT.replace(/\/$/, ""),
    appId: LOGTO_APP_ID,
    clientSecret: LOGTO_CLIENT_SECRET,
    redirectUri: LOGTO_REDIRECT_URI,
  };
}

// ── PKCE / OIDC cookie helpers ────────────────────────────────────────────────

// SameSite=None is required for iOS Safari (ITP drops SameSite=Lax cookies in
// cross-site redirect chains). CSRF protection is provided by the state parameter.
const OIDC_COOKIE_ATTRS = "HttpOnly; Secure; SameSite=None; Path=/api/auth/logto/callback; Max-Age=600";
const OIDC_COOKIE_CLEAR = "HttpOnly; Secure; SameSite=None; Path=/api/auth/logto/callback; Max-Age=0";

function setCookies(values: Record<string, string>): string[] {
  return Object.entries(values).map(([k, v]) => `${k}=${v}; ${OIDC_COOKIE_ATTRS}`);
}

function clearCookies(): string[] {
  return ["oidc_state", "oidc_cv", "oidc_nonce"].map(
    (k) => `${k}=; ${OIDC_COOKIE_CLEAR}`,
  );
}

function parseCookie(header: string, name: string): string | null {
  for (const pair of header.split(";")) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    if (pair.slice(0, eq).trim() === name) {
      return pair.slice(eq + 1).trim() || null;
    }
  }
  return null;
}

// ── Start OIDC flow ───────────────────────────────────────────────────────────

async function startOidcFlow(
  config: LogtoConfig,
  connectorTarget: string,
): Promise<Response> {
  const verifier = generateCodeVerifier();
  const challenge = await deriveCodeChallenge(verifier);
  const state = generateRandomParam();
  const nonce = generateRandomParam();

  const authUrl = new URL(`${config.endpoint}/oidc/auth`);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", config.appId);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("scope", "openid email");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("nonce", nonce);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("direct_sign_in", `social:${connectorTarget}`);

  const headers = new Headers({ Location: authUrl.toString() });
  for (const c of setCookies({ oidc_state: state, oidc_cv: verifier, oidc_nonce: nonce })) {
    headers.append("Set-Cookie", c);
  }

  return new Response(null, { status: 302, headers });
}

// ── Route: Google ─────────────────────────────────────────────────────────────

export async function handleLogtoGoogle(env: LogtoEnv): Promise<Response> {
  const config = getConfig(env);
  if (!config) {
    return new Response(
      JSON.stringify({ error: "Google login not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
  const target = env.LOGTO_GOOGLE_CONNECTOR_TARGET || "google";
  return startOidcFlow(config, target);
}

// ── Route: Apple ──────────────────────────────────────────────────────────────

export async function handleLogtoApple(env: LogtoEnv): Promise<Response> {
  const config = getConfig(env);
  if (!config) {
    return new Response(
      JSON.stringify({ error: "Apple login not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
  const target = env.LOGTO_APPLE_CONNECTOR_TARGET;
  if (!target) {
    return new Response(
      JSON.stringify({ error: "Apple login not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
  return startOidcFlow(config, target);
}

// ── JWT / JWKS verification ───────────────────────────────────────────────────

export interface JwkSet {
  keys: JsonWebKey[];
}

export type JwksFetcher = (url: string) => Promise<JwkSet>;

/** Production JWKS fetcher — calls Logto's JWKS endpoint. */
export async function fetchJwks(url: string): Promise<JwkSet> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  return res.json<JwkSet>();
}

function base64UrlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/**
 * Verify a Logto RS256 ID token.
 * Returns the stable subject, email, and email_verified claims on success.
 * Throws a descriptive Error on any validation failure.
 *
 * @param idToken     raw JWT string from the token endpoint
 * @param expected    issuer, clientId, and nonce to validate against
 * @param jwksFetcher injectable for testing; defaults to production fetch
 * @param jwksUri     JWKS endpoint; derived from issuer when not provided
 */
export async function verifyLogtoIdToken(
  idToken: string,
  expected: { issuer: string; clientId: string; nonce: string },
  jwksFetcher: JwksFetcher,
  jwksUri: string,
): Promise<{ sub: string; email?: string; email_verified?: boolean }> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");

  const [headerB64, payloadB64, sigB64] = parts as [string, string, string];

  let header: { alg: string; kid?: string };
  let payload: {
    iss?: string;
    aud?: string;
    sub?: string;
    exp?: number;
    iat?: number;
    nonce?: string;
    email?: string;
    email_verified?: boolean;
  };

  try {
    header = JSON.parse(new TextDecoder().decode(base64UrlDecode(headerB64)));
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));
  } catch {
    throw new Error("JWT decode failed");
  }

  if (header.alg !== "RS256") throw new Error(`Unsupported JWT alg: ${header.alg}`);

  // Claim validation
  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== expected.issuer) throw new Error("JWT issuer mismatch");
  if (payload.aud !== expected.clientId) throw new Error("JWT audience mismatch");
  if (!payload.sub) throw new Error("JWT missing sub");
  if (typeof payload.exp !== "number" || payload.exp <= now) throw new Error("JWT expired");
  if (typeof payload.iat !== "number" || payload.iat > now + 60) throw new Error("JWT iat in future");
  if (payload.nonce !== expected.nonce) throw new Error("JWT nonce mismatch");

  // Signature verification
  const jwks = await jwksFetcher(jwksUri);
  const jwk = header.kid
    ? jwks.keys.find((k) => (k as { kid?: string }).kid === header.kid)
    : jwks.keys[0];

  if (!jwk) throw new Error("No matching JWK found");

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlDecode(sigB64);

  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    signature,
    signingInput,
  );

  if (!valid) throw new Error("JWT signature invalid");

  const result: { sub: string; email?: string; email_verified?: boolean } = {
    sub: payload.sub,
  };
  if (payload.email !== undefined) result.email = payload.email;
  if (payload.email_verified !== undefined) result.email_verified = payload.email_verified;
  return result;
}

// ── Route: Callback ───────────────────────────────────────────────────────────

export async function handleLogtoCallback(
  request: Request,
  db: D1Database,
  env: LogtoEnv,
  jwksFetcher: JwksFetcher = fetchJwks,
): Promise<Response> {
  const config = getConfig(env);
  if (!config) {
    return new Response("OAuth provider not configured", { status: 503 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    return new Response(`OAuth error: ${errorParam}`, { status: 400 });
  }

  if (!code || !returnedState) {
    return new Response("Missing code or state", { status: 400 });
  }

  const cookieHeader = request.headers.get("Cookie") ?? "";
  const savedState = parseCookie(cookieHeader, "oidc_state");
  const verifier = parseCookie(cookieHeader, "oidc_cv");
  const savedNonce = parseCookie(cookieHeader, "oidc_nonce");

  if (!savedState || !verifier || !savedNonce) {
    return new Response("Missing OIDC session cookies", { status: 400 });
  }
  if (returnedState !== savedState) {
    return new Response("State mismatch", { status: 400 });
  }

  // Token exchange
  const tokenRes = await fetch(`${config.endpoint}/oidc/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
      client_id: config.appId,
      client_secret: config.clientSecret,
      code_verifier: verifier,
    }),
  });

  if (!tokenRes.ok) {
    return new Response("Token exchange failed", { status: 502 });
  }

  const tokens = await tokenRes.json<{ id_token?: string }>();
  if (!tokens.id_token) {
    return new Response("No id_token in response", { status: 502 });
  }

  // ID token verification
  const issuer = `${config.endpoint}/oidc`;
  const jwksUri = `${config.endpoint}/oidc/jwks`;

  let claims: { sub: string; email?: string; email_verified?: boolean };
  try {
    claims = await verifyLogtoIdToken(
      tokens.id_token,
      { issuer, clientId: config.appId, nonce: savedNonce },
      jwksFetcher,
      jwksUri,
    );
  } catch {
    return new Response("Invalid ID token", { status: 401 });
  }

  // Require verified email when the provider supplies email_verified
  if (claims.email && claims.email_verified === false) {
    return new Response("Provider email not verified", { status: 401 });
  }

  // Owner lookup / creation
  const ownerId = await resolveOwner(db, claims.sub, claims.email ?? null);

  // Create MishiPass session
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const rawToken = Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const tokenHash = await sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await insertSession(db, { token_hash: tokenHash, owner_id: ownerId, expires_at: expiresAt });

  const sessionCookie = `session=${rawToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`;

  const headers = new Headers({
    Location: "/dashboard",
    "Set-Cookie": sessionCookie,
  });
  for (const c of clearCookies()) {
    headers.append("Set-Cookie", c);
  }

  return new Response(null, { status: 302, headers });
}

// ── Owner resolution ──────────────────────────────────────────────────────────

async function resolveOwner(
  db: D1Database,
  providerSub: string,
  email: string | null,
): Promise<number> {
  // 1. Look up existing identity mapping
  const existing = await findOwnerIdentity(db, "logto", providerSub);
  if (existing) {
    // Update email in case it changed
    if (email !== existing.email) {
      await updateOwnerIdentityEmail(db, "logto", providerSub, email);
    }
    return existing.owner_id;
  }

  // 2. If no mapping exists and we have a verified email, check for an
  //    existing email/password owner to link to.
  if (email) {
    const ownerByEmail = await findOwnerByEmail(db, email.toLowerCase());
    if (ownerByEmail) {
      await insertOwnerIdentity(db, {
        owner_id: ownerByEmail.id,
        provider: "logto",
        provider_sub: providerSub,
        email,
      });
      return ownerByEmail.id;
    }
  }

  // 3. No existing owner — create one.
  let newOwnerId: number;
  if (email) {
    try {
      newOwnerId = await insertOwnerForOidc(db, email.toLowerCase());
    } catch (err: unknown) {
      // Race: another request just created the owner with this email.
      if (err instanceof Error && err.message.includes("UNIQUE")) {
        const raceOwner = await findOwnerByEmail(db, email.toLowerCase());
        if (!raceOwner) throw new Error("Owner creation race: no owner found after UNIQUE error");
        newOwnerId = raceOwner.id;
      } else {
        throw err;
      }
    }
  } else {
    // Logto user has no email — create with a placeholder address.
    const placeholder = `logto:${providerSub}@noemail.mishipass`;
    newOwnerId = await insertOwnerForOidc(db, placeholder);
  }

  await insertOwnerIdentity(db, {
    owner_id: newOwnerId,
    provider: "logto",
    provider_sub: providerSub,
    email,
  });

  return newOwnerId;
}
