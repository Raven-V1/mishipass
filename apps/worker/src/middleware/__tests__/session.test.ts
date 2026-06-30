/**
 * Session middleware unit tests.
 *
 * These tests mock findSessionByTokenHash to isolate the middleware logic
 * from D1. They cover cookie parsing edge cases, expiry, and the security
 * hardening additions (malformed percent-encoding, oversized tokens).
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { resolveSession } from "../session.js";

// -- Mock the DB repository layer ------------------------------------------

const mockFindSession = vi.fn();

vi.mock("../../db/index.js", () => ({
  findSessionByTokenHash: (...args: unknown[]) => mockFindSession(...args),
}));

function makeRequest(cookieHeader?: string): Request {
  const headers = new Headers();
  if (cookieHeader !== undefined) {
    headers.set("Cookie", cookieHeader);
  }
  return new Request("https://example.com/", { headers });
}

const fakeDb = {} as D1Database;

beforeEach(() => {
  mockFindSession.mockReset();
});

// ---------------------------------------------------------------------------

describe("resolveSession", () => {
  it("returns ownerId: null when no Cookie header is present", async () => {
    const result = await resolveSession(makeRequest(), fakeDb);
    expect(result.ownerId).toBeNull();
    expect(mockFindSession).not.toHaveBeenCalled();
  });

  it("returns null when Cookie header exists but session cookie is missing", async () => {
    const result = await resolveSession(makeRequest("theme=dark; lang=en"), fakeDb);
    expect(result.ownerId).toBeNull();
    expect(mockFindSession).not.toHaveBeenCalled();
  });

  it("returns null when session token hash has no matching row", async () => {
    mockFindSession.mockResolvedValue(null);
    const result = await resolveSession(makeRequest("session=sometoken"), fakeDb);
    expect(result.ownerId).toBeNull();
    expect(mockFindSession).toHaveBeenCalledOnce();
  });

  it("returns null when session exists but expires_at is in the past", async () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    mockFindSession.mockResolvedValue({ owner_id: 42, expires_at: past });
    const result = await resolveSession(makeRequest("session=expiredtoken"), fakeDb);
    expect(result.ownerId).toBeNull();
  });

  it("parses the correct cookie from multiple cookies without throwing", async () => {
    const future = new Date(Date.now() + 3_600_000).toISOString();
    mockFindSession.mockResolvedValue({ owner_id: 7, expires_at: future });
    const result = await resolveSession(
      makeRequest("theme=dark; session=validtoken; lang=en"),
      fakeDb
    );
    expect(result.ownerId).toBe(7);
  });

  it("handles malformed cookie string (no =, stray semicolons) without throwing", async () => {
    const result = await resolveSession(
      makeRequest(";;;noseparator;;;session=tok;;extra"),
      fakeDb
    );
    // "noseparator" has no =, should be skipped. "session=tok" should parse.
    // The mock returns null so ownerId is null, but the point is no throw.
    mockFindSession.mockResolvedValue(null);
    expect(result.ownerId).toBeNull();
  });

  it("returns null and does not throw on malformed percent-encoded cookie value", async () => {
    // A bare trailing % is invalid percent-encoding and would throw URIError
    // if not caught.
    const result = await resolveSession(makeRequest("session=bad%"), fakeDb);
    expect(result.ownerId).toBeNull();
    expect(mockFindSession).not.toHaveBeenCalled();
  });

  it("returns null without calling findSessionByTokenHash for tokens longer than 256 chars", async () => {
    const longToken = "x".repeat(300);
    const result = await resolveSession(makeRequest(`session=${longToken}`), fakeDb);
    expect(result.ownerId).toBeNull();
    expect(mockFindSession).not.toHaveBeenCalled();
  });
});
