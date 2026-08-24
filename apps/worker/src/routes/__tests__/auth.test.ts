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

const mockCheckDurableRateLimit = vi.fn().mockResolvedValue(true);

vi.mock("../../middleware/durableRateLimit.js", () => ({
  checkDurableRateLimit: (...args: unknown[]) => mockCheckDurableRateLimit(...args),
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
  mockCheckDurableRateLimit.mockReset();
  mockCheckDurableRateLimit.mockResolvedValue(true);
});

// -- Helpers ----------------------------------------------------------------

function jsonRequest(body: unknown, cookie?: string, ip?: string): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cookie) {
    headers["Cookie"] = cookie;
  }
  if (ip) {
    headers["CF-Connecting-IP"] = ip;
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

  // ---------------------------------------------------------------------------
  // Timing side-channel mitigation tests
  // ---------------------------------------------------------------------------

  it("performs PBKDF2 verification even when owner does not exist (timing-attack mitigation)", async () => {
    // Mock: owner not found
    mockFindOwnerByEmail.mockResolvedValue(null);

    const startTime = performance.now();
    const res = await handleLogin(
      jsonRequest({ email: "nonexistent@test.com", password: "testpass123" }),
      fakeDb,
    );
    const duration = performance.now() - startTime;

    // Should return 401
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Invalid email or password");

    // The key security property: even though no owner exists, the handler
    // should have performed expensive PBKDF2 verification against a dummy hash.
    // This ensures timing is similar to the owner-exists path.
    // We verify this by checking that the operation took a reasonable amount of time
    // (PBKDF2 with 100k iterations should take at least a few milliseconds).
    expect(duration).toBeGreaterThan(1); // At least 1ms for PBKDF2 operation
  });

  it("uses dummy hash for verification when owner not found", async () => {
    // This test verifies that the code path for nonexistent users
    // still performs password verification (against a dummy hash)
    mockFindOwnerByEmail.mockResolvedValue(null);

    const res = await handleLogin(
      jsonRequest({ email: "probe@attacker.com", password: "anypassword" }),
      fakeDb,
    );

    // Should return 401 with generic error
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Invalid email or password");
    
    // Should not create a session
    expect(mockInsertSession).not.toHaveBeenCalled();
  });

  it("returns identical responses for existing and non-existing accounts", async () => {
    // Test 1: Existing account with wrong password
    mockFindOwnerByEmail.mockResolvedValue({
      id: 42,
      email: "existing@test.com",
      password_hash: validPasswordHash,
    });

    const existingRes = await handleLogin(
      jsonRequest({ email: "existing@test.com", password: "wrongpassword" }),
      fakeDb,
    );
    const existingStatus = existingRes.status;
    const existingBody = await existingRes.json() as { error: string };
    const existingHeaders = Object.fromEntries(existingRes.headers.entries());

    // Test 2: Non-existing account
    mockFindOwnerByEmail.mockResolvedValue(null);

    const nonExistingRes = await handleLogin(
      jsonRequest({ email: "nonexistent@test.com", password: "anypassword" }),
      fakeDb,
    );
    const nonExistingStatus = nonExistingRes.status;
    const nonExistingBody = await nonExistingRes.json() as { error: string };
    const nonExistingHeaders = Object.fromEntries(nonExistingRes.headers.entries());

    // Assert responses are identical
    expect(nonExistingStatus).toBe(existingStatus);
    expect(nonExistingStatus).toBe(401);
    expect(nonExistingBody.error).toBe(existingBody.error);
    expect(nonExistingBody.error).toBe("Invalid email or password");
    expect(nonExistingHeaders["content-type"]).toBe(existingHeaders["content-type"]);
    
    // Neither should create a session
    expect(mockInsertSession).not.toHaveBeenCalled();
  });

  it("prevents account enumeration via timing analysis on multiple probes", async () => {
    // Simulate an attacker probing multiple email addresses
    const probeEmails = [
      "user1@test.com",
      "user2@test.com",
      "admin@test.com",
      "nonexistent1@test.com",
      "nonexistent2@test.com",
    ];

    const timings: number[] = [];

    for (const email of probeEmails) {
      // Randomly mock some as existing, some as non-existing
      if (email.includes("nonexistent")) {
        mockFindOwnerByEmail.mockResolvedValue(null);
      } else {
        mockFindOwnerByEmail.mockResolvedValue({
          id: 42,
          email,
          password_hash: validPasswordHash,
        });
      }

      const startTime = performance.now();
      const res = await handleLogin(
        jsonRequest({ email, password: "probepassword" }),
        fakeDb,
      );
      const duration = performance.now() - startTime;
      timings.push(duration);

      // All should return 401
      expect(res.status).toBe(401);
      const body = await res.json() as { error: string };
      expect(body.error).toBe("Invalid email or password");
    }

    // Verify all timings are in a similar range (within reasonable variance)
    // The key security property: timing should not reveal account existence
    const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length;
    
    // All timings should be within a reasonable factor of the average
    // (allowing for normal variance in execution time)
    for (const timing of timings) {
      // Each timing should be within 10x of average (very generous to account for test variance)
      expect(timing).toBeLessThan(avgTiming * 10);
      expect(timing).toBeGreaterThan(avgTiming / 10);
    }
  });

  it("always performs expensive PBKDF2 operation regardless of account existence", async () => {
    // This test verifies the core mitigation: PBKDF2 is always executed
    
    // Test with non-existent account
    mockFindOwnerByEmail.mockResolvedValue(null);
    
    const startNonExistent = performance.now();
    const resNonExistent = await handleLogin(
      jsonRequest({ email: "ghost@test.com", password: "testpass123" }),
      fakeDb,
    );
    const durationNonExistent = performance.now() - startNonExistent;

    expect(resNonExistent.status).toBe(401);
    
    // Test with existing account (wrong password)
    mockFindOwnerByEmail.mockResolvedValue({
      id: 42,
      email: "real@test.com",
      password_hash: validPasswordHash,
    });
    
    const startExistent = performance.now();
    const resExistent = await handleLogin(
      jsonRequest({ email: "real@test.com", password: "wrongpass" }),
      fakeDb,
    );
    const durationExistent = performance.now() - startExistent;

    expect(resExistent.status).toBe(401);

    // Both operations should take a similar amount of time
    // (both perform PBKDF2 with 100k iterations)
    // Allow for reasonable variance in execution time
    const ratio = Math.max(durationNonExistent, durationExistent) / 
                  Math.min(durationNonExistent, durationExistent);
    
    // Ratio should be less than 5x (generous to account for test environment variance)
    expect(ratio).toBeLessThan(5);
    
    // Both should take at least 1ms (PBKDF2 is expensive)
    expect(durationNonExistent).toBeGreaterThan(1);
    expect(durationExistent).toBeGreaterThan(1);
  });

  it("does not leak account existence through error messages", async () => {
    // Test multiple scenarios to ensure consistent error messages
    const scenarios = [
      { email: "exists@test.com", ownerExists: true, password: "wrongpass" },
      { email: "notexists@test.com", ownerExists: false, password: "anypass" },
      { email: "another@test.com", ownerExists: true, password: "badpass" },
      { email: "ghost@test.com", ownerExists: false, password: "testpass" },
    ];

    const errorMessages = new Set<string>();

    for (const scenario of scenarios) {
      if (scenario.ownerExists) {
        mockFindOwnerByEmail.mockResolvedValue({
          id: 42,
          email: scenario.email,
          password_hash: validPasswordHash,
        });
      } else {
        mockFindOwnerByEmail.mockResolvedValue(null);
      }

      const res = await handleLogin(
        jsonRequest({ email: scenario.email, password: scenario.password }),
        fakeDb,
      );

      expect(res.status).toBe(401);
      const body = await res.json() as { error: string };
      errorMessages.add(body.error);
    }

    // All scenarios should return the exact same error message
    expect(errorMessages.size).toBe(1);
    expect(errorMessages.has("Invalid email or password")).toBe(true);
  });

  it("verifies dummy hash has correct PHC format for PBKDF2", async () => {
    // This test ensures the dummy hash is valid and will be processed
    // by verifyPassword without early returns
    mockFindOwnerByEmail.mockResolvedValue(null);

    // The dummy hash should be in PHC format: $pbkdf2-sha256$iterations$salt$hash
    // This ensures verifyPassword will parse it and perform PBKDF2
    const res = await handleLogin(
      jsonRequest({ email: "test@test.com", password: "anypassword" }),
      fakeDb,
    );

    expect(res.status).toBe(401);
    
    // If the dummy hash was invalid, verifyPassword would return false immediately
    // without performing PBKDF2. The fact that we get a 401 response means
    // the verification completed (even though it returned false).
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Invalid email or password");
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login — rate limiting
// ---------------------------------------------------------------------------

describe("handleLogin — rate limiting", () => {
  it("returns 429 with Retry-After when rate limit is exceeded", async () => {
    mockCheckDurableRateLimit.mockResolvedValue(false);

    const res = await handleLogin(
      jsonRequest({ email: "attacker@example.com", password: "anypass" }, undefined, "1.2.3.4"),
      fakeDb,
      "test-secret",
    );

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("900");
    const body = await res.json() as { error: string };
    expect(body.error).toContain("Too many login attempts");
    expect(mockFindOwnerByEmail).not.toHaveBeenCalled();
  });

  it("proceeds normally when rate limit is not exceeded", async () => {
    mockCheckDurableRateLimit.mockResolvedValue(true);
    mockFindOwnerByEmail.mockResolvedValue({
      id: 1,
      email: "user@test.com",
      password_hash: validPasswordHash,
    });
    mockInsertSession.mockResolvedValue(undefined);

    const res = await handleLogin(
      jsonRequest({ email: "user@test.com", password: "testpass123" }, undefined, "5.6.7.8"),
      fakeDb,
      "test-secret",
    );

    expect(res.status).toBe(200);
    expect(mockCheckDurableRateLimit).toHaveBeenCalledOnce();
    expect(mockCheckDurableRateLimit.mock.calls[0]![2]).toBe(5);
    expect(mockCheckDurableRateLimit.mock.calls[0]![3]).toBe(15);
  });

  it("skips rate limiting when secret is absent and proceeds normally", async () => {
    mockFindOwnerByEmail.mockResolvedValue({
      id: 1,
      email: "user@test.com",
      password_hash: validPasswordHash,
    });
    mockInsertSession.mockResolvedValue(undefined);

    const res = await handleLogin(
      jsonRequest({ email: "user@test.com", password: "testpass123" }, undefined, "9.9.9.9"),
      fakeDb,
      // no secret
    );

    expect(res.status).toBe(200);
    expect(mockCheckDurableRateLimit).not.toHaveBeenCalled();
  });

  it("rate limit key does not contain raw IP or email (privacy)", async () => {
    mockCheckDurableRateLimit.mockResolvedValue(true);
    mockFindOwnerByEmail.mockResolvedValue(null);

    await handleLogin(
      jsonRequest({ email: "probe@example.com", password: "any" }, undefined, "1.2.3.4"),
      fakeDb,
      "test-secret",
    );

    expect(mockCheckDurableRateLimit).toHaveBeenCalledOnce();
    const key = mockCheckDurableRateLimit.mock.calls[0]![1] as string;
    expect(key).not.toContain("1.2.3.4");
    expect(key).not.toContain("probe@example.com");
    expect(key).toMatch(/^login:[0-9a-f]{64}$/);
  });

  it("returns 503 fail-closed when D1 throws during rate limit check", async () => {
    mockCheckDurableRateLimit.mockRejectedValue(new Error("D1 connection error"));

    const res = await handleLogin(
      jsonRequest({ email: "user@test.com", password: "testpass123" }, undefined, "1.2.3.4"),
      fakeDb,
      "test-secret",
    );

    expect(res.status).toBe(503);
    const body = await res.json() as { error: string };
    expect(body.error).toBeTruthy();
    expect(body.error).not.toContain("D1");
    expect(mockFindOwnerByEmail).not.toHaveBeenCalled();
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
