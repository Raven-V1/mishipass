/**
 * Owner authentication route handlers.
 *
 * - POST /api/auth/register — create owner account with PBKDF2 password hash
 * - POST /api/auth/login — opaque session token, HttpOnly cookie
 * - POST /api/auth/logout — delete session, clear cookie
 */

import {
  deleteSession,
  findOwnerByEmail,
  insertOwner,
  insertSession,
} from "../db/index.js";
import { parseCookieValue } from "../middleware/session.js";
import { hashPassword, sha256Hex, verifyPassword } from "../utils/crypto.js";

// -- Helpers ----------------------------------------------------------------

function jsonResponse(body: unknown, status: number, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...Object.fromEntries(new Headers(headers).entries()),
    },
  });
}

function clearSessionCookie(): string {
  return "session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";
}

// -- Register ---------------------------------------------------------------

export async function handleRegister(
  request: Request,
  db: D1Database,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request" }, 400);
  }

  const { email, password } = body as { email?: string; password?: string };

  if (
    !email ||
    typeof email !== "string" ||
    !email.includes("@") ||
    !password ||
    typeof password !== "string" ||
    password.length < 8
  ) {
    return jsonResponse({ error: "Invalid request" }, 400);
  }

  const normalizedEmail = email.toLowerCase();
  const passwordHash = await hashPassword(password);

  try {
    await insertOwner(db, { email: normalizedEmail, password_hash: passwordHash });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("UNIQUE")) {
      return jsonResponse({ error: "Email already registered" }, 409);
    }
    throw err;
  }

  return jsonResponse({}, 201);
}

// -- Login ------------------------------------------------------------------

export async function handleLogin(
  request: Request,
  db: D1Database,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request" }, 400);
  }

  const { email, password } = body as { email?: string; password?: string };

  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    return jsonResponse({ error: "Invalid email or password" }, 401);
  }

  const normalizedEmail = email.toLowerCase();
  const owner = await findOwnerByEmail(db, normalizedEmail);

  if (!owner) {
    return jsonResponse({ error: "Invalid email or password" }, 401);
  }

  const valid = await verifyPassword(password, owner.password_hash);
  if (!valid) {
    return jsonResponse({ error: "Invalid email or password" }, 401);
  }

  // Generate opaque session token: 32 bytes, hex-encoded
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const rawToken = Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const tokenHash = await sha256Hex(rawToken);

  // 30-day expiry
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await insertSession(db, {
    token_hash: tokenHash,
    owner_id: owner.id,
    expires_at: expiresAt,
  });

  const cookie = `session=${rawToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`;

  return jsonResponse({}, 200, { "Set-Cookie": cookie });
}

// -- Logout -----------------------------------------------------------------

export async function handleLogout(
  request: Request,
  db: D1Database,
): Promise<Response> {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  const token = parseCookieValue(cookieHeader, "session");

  if (token) {
    const tokenHash = await sha256Hex(token);
    await deleteSession(db, tokenHash);
  }

  return jsonResponse({}, 200, { "Set-Cookie": clearSessionCookie() });
}
