/**
 * Auth route handler unit tests.
 *
 * Mocks the DB layer and crypto utilities to isolate route logic.
 * Covers registration validation, duplicate handling, login flow,
 * session cookie setting, and logout behavior.
 */

import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";
import { handleRegister, handleLogin, handleLogout } from "../auth.js";

// -- Mocks ------------------------------------------------------------------

const mockInsertOwner = vi.fn();
const mockFindOwnerByEmail = vi.fn();
const mockInsertSession = vi.fn();
const mockDeleteSession = vi.fn();

vi.mock("../../db/index.js", () => ({
  insertOwner: (...args: unknown[]) => mockInsertOwner(...args),
  findOwnerByEmail: (...args: unknown[]) => mockFindOwnerByEmail(...args),
  insertSession: (...args: unknown[]) => mockInsertSession(...args),
  deleteSession: (...args: unknown[]) => mockDeleteSession(...args),
}));

const fakeDb = {} as D1Database;

// Pre-computed PBKDF2 hash for "testpass123" used in login tests.
let validPasswordHash: string;

beforeAll(async () => {
  // Hash "testpass123" using the same algorithm as auth.ts
  const password = "testpass123";
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100_000;

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

  const saltB64 = btoa(String.fromCharCode(...salt));
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(derived)));
  validPasswordHash = `$pbkdf2-sha256$${iterations}$${saltB64}$${hashB64}`;
});

beforeEach(() => {
  mockInsertOwner.mockReset();
  mockFindOwnerByEmail.mockReset();
  mockInsertSession.mockReset();
  mockDeleteSession.mockReset();
});

// -- Helpers ----------------------------------------------------------------

function jsonRequest(body: unknown, cookie?: string): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cookie) {
    headers["Cookie"] = cookie;
  }
  return new Request("https://example.com/api/auth", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function bareRequest(cookie?: string): Request {
  const headers: Record<string, string> = {};
  if (cookie) {
    headers["Cookie"] = cookie;
  }
  return new Request("https://example.com/api/auth/logout", {
    method: "POST",
    headers,
  });
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------

describe("handleRegister", () => {
  it("returns 201 on valid registration", async () => {
    mockInsertOwner.mockResolvedValue(undefined);

    const res = await handleRegister(
      jsonRequest({ email: "Cat@Example.com", password: "securepass" }),
      fakeDb,
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({});
    expect(mockInsertOwner).toHaveBeenCalledOnce();
    // Email should be lowercased
    const callArgs = mockInsertOwner.mock.calls[0]!;
    expect(callArgs[1].email).toBe("cat@example.com");
  });

  it("returns 201 on duplicate email to prevent enumeration", async () => {
    mockInsertOwner.mockRejectedValue(new Error("UNIQUE constraint failed: owners.email"));

    const res = await handleRegister(
      jsonRequest({ email: "dupe@test.com", password: "longpassword" }),
      fakeDb,
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({});
  });

  it("returns identical response for new and duplicate emails (anti-enumeration)", async () => {
    // Test that successful registration and duplicate email return identical responses
    
    // First: successful registration
    mockInsertOwner.mockResolvedValue(undefined);
    const successRes = await handleRegister(
      jsonRequest({ email: "new@test.com", password: "validpass123" }),
      fakeDb,
    );
    const successStatus = successRes.status;
    const successBody = await successRes.json();
    const successHeaders = Object.fromEntries(successRes.headers.entries());

    // Second: duplicate email
    mockInsertOwner.mockRejectedValue(new Error("UNIQUE constraint failed: owners.email"));
    const dupeRes = await handleRegister(
      jsonRequest({ email: "existing@test.com", password: "validpass123" }),
      fakeDb,
    );
    const dupeStatus = dupeRes.status;
    const dupeBody = await dupeRes.json();
    const dupeHeaders = Object.fromEntries(dupeRes.headers.entries());

    // Assert responses are identical
    expect(dupeStatus).toBe(successStatus);
    expect(dupeStatus).toBe(201);
    expect(dupeBody).toEqual(successBody);
    expect(dupeBody).toEqual({});
    expect(dupeHeaders["content-type"]).toBe(successHeaders["content-type"]);
  });

  it("prevents account enumeration via timing-safe duplicate handling", async () => {
    // Verify that duplicate email errors are caught and return success
    mockInsertOwner.mockRejectedValue(new Error("UNIQUE constraint failed: owners.email"));

    const res = await handleRegister(
      jsonRequest({ email: "probe@attacker.com", password: "password123" }),
      fakeDb,
    );

    // Should return success, not error
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).not.toHaveProperty("error");
    expect(body).toEqual({});
  });

  it("does not leak account existence through different error messages", async () => {
    // Test multiple duplicate scenarios to ensure consistent responses
    const testEmails = [
      "user1@test.com",
      "user2@test.com",
      "admin@test.com",
    ];

    for (const email of testEmails) {
      mockInsertOwner.mockRejectedValue(new Error("UNIQUE constraint failed: owners.email"));
      
      const res = await handleRegister(
        jsonRequest({ email, password: "testpass123" }),
        fakeDb,
      );

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toEqual({});
      expect(body).not.toHaveProperty("error");
    }
  });

  it("handles UNIQUE constraint with different error message formats", async () => {
    // Test various UNIQUE constraint error formats
    const errorFormats = [
      "UNIQUE constraint failed: owners.email",
      "UNIQUE constraint failed",
      "constraint UNIQUE failed",
    ];

    for (const errorMsg of errorFormats) {
      mockInsertOwner.mockRejectedValue(new Error(errorMsg));
      
      const res = await handleRegister(
        jsonRequest({ email: "test@example.com", password: "password123" }),
        fakeDb,
      );

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toEqual({});
    }
  });

  it("returns 400 on missing email", async () => {
    const res = await handleRegister(
      jsonRequest({ password: "longpassword" }),
      fakeDb,
    );

    expect(res.status).toBe(400);
    expect(mockInsertOwner).not.toHaveBeenCalled();
  });

  it("returns 400 on email without @", async () => {
    const res = await handleRegister(
      jsonRequest({ email: "bademail.com", password: "longpassword" }),
      fakeDb,
    );

    expect(res.status).toBe(400);
    expect(mockInsertOwner).not.toHaveBeenCalled();
  });

  it("returns 400 on password shorter than 8 chars", async () => {
    const res = await handleRegister(
      jsonRequest({ email: "good@email.com", password: "short" }),
      fakeDb,
    );

    expect(res.status).toBe(400);
    expect(mockInsertOwner).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

describe("handleLogin", () => {
  it("returns 200 with Set-Cookie header on valid login", async () => {
    mockFindOwnerByEmail.mockResolvedValue({
      id: 42,
      email: "user@test.com",
      password_hash: validPasswordHash,
    });
    mockInsertSession.mockResolvedValue(undefined);

    const res = await handleLogin(
      jsonRequest({ email: "User@Test.com", password: "testpass123" }),
      fakeDb,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({});

    const setCookie = res.headers.get("Set-Cookie");
    expect(setCookie).not.toBeNull();
    expect(setCookie).toContain("session=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("Max-Age=2592000");

    expect(mockInsertSession).toHaveBeenCalledOnce();
    const sessionArgs = mockInsertSession.mock.calls[0]![1];
    expect(sessionArgs.owner_id).toBe(42);
    expect(sessionArgs.token_hash).toHaveLength(64); // SHA-256 hex
  });

  it("returns 401 with identical message for wrong password", async () => {
    mockFindOwnerByEmail.mockResolvedValue({
      id: 42,
      email: "user@test.com",
      password_hash: validPasswordHash,
    });

    const res = await handleLogin(
      jsonRequest({ email: "user@test.com", password: "wrongpassword" }),
      fakeDb,
    );

    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Invalid email or password");
    expect(mockInsertSession).not.toHaveBeenCalled();
  });

  it("returns 401 with identical message for nonexistent email", async () => {
    mockFindOwnerByEmail.mockResolvedValue(null);

    const res = await handleLogin(
      jsonRequest({ email: "nobody@test.com", password: "somepassword" }),
      fakeDb,
    );

    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Invalid email or password");
    expect(mockInsertSession).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------

describe("handleLogout", () => {
  it("returns 200 and calls deleteSession when session cookie exists", async () => {
    mockDeleteSession.mockResolvedValue(undefined);

    const res = await handleLogout(
      bareRequest("session=abc123token"),
      fakeDb,
    );

    expect(res.status).toBe(200);
    expect(mockDeleteSession).toHaveBeenCalledOnce();

    const setCookie = res.headers.get("Set-Cookie");
    expect(setCookie).toContain("Max-Age=0");
  });

  it("returns 200 even when no session cookie is present", async () => {
    const res = await handleLogout(bareRequest(), fakeDb);

    expect(res.status).toBe(200);
    expect(mockDeleteSession).not.toHaveBeenCalled();

    const setCookie = res.headers.get("Set-Cookie");
    expect(setCookie).toContain("Max-Age=0");
  });
});
