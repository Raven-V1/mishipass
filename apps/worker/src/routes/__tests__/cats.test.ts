/**
 * Cats route handler unit tests.
 *
 * Mocks the DB layer and shared-validation to isolate route logic.
 * Covers auth gating, input validation, retry behavior, HTML escaping,
 * nosniff headers, and the security hardening additions.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { handleCreateCat, handlePublicProfile } from "../cats.js";
import type { RequestContext } from "../../middleware/session.js";

// -- Mocks ------------------------------------------------------------------

const mockInsertCat = vi.fn();
const mockGetCatPublicProfile = vi.fn();
const mockGetContactSettingsPublic = vi.fn();
const mockGetMissingAlertPublic = vi.fn();

vi.mock("../../db/index.js", () => ({
  insertCat: (...args: unknown[]) => mockInsertCat(...args),
  getCatPublicProfile: (...args: unknown[]) => mockGetCatPublicProfile(...args),
  getContactSettingsPublic: (...args: unknown[]) => mockGetContactSettingsPublic(...args),
  getMissingAlertPublic: (...args: unknown[]) => mockGetMissingAlertPublic(...args),
}));

let mockGenerateIdCallCount = 0;
const mockGenerateId = vi.fn();
const mockValidateId = vi.fn();

vi.mock("@mishipass/shared-validation", () => ({
  generateId: (...args: unknown[]) => mockGenerateId(...args),
  validateId: (...args: unknown[]) => mockValidateId(...args),
}));

const fakeDb = {} as D1Database;
const PUBLIC_BASE_URL = "https://mishipass.example.com";

function jsonRequest(body: unknown): Request {
  return new Request("https://example.com/api/cats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockInsertCat.mockReset();
  mockGetCatPublicProfile.mockReset();
  mockGetContactSettingsPublic.mockReset();
  mockGetMissingAlertPublic.mockReset();
  mockGenerateId.mockReset();
  mockValidateId.mockReset();
  mockGenerateIdCallCount = 0;
  mockGenerateId.mockImplementation(() => {
    mockGenerateIdCallCount++;
    return `MP-MX-0000-000${mockGenerateIdCallCount}`;
  });
});

// ---------------------------------------------------------------------------
// POST /api/cats
// ---------------------------------------------------------------------------

describe("handleCreateCat", () => {
  const authed: RequestContext = { ownerId: 1 };
  const unauthed: RequestContext = { ownerId: null };

  it("returns 401 with no valid session, no D1 write attempted", async () => {
    const res = await handleCreateCat(jsonRequest({ name: "Mishi", countryCode: "MX" }), fakeDb, PUBLIC_BASE_URL, unauthed);
    expect(res.status).toBe(401);
    expect(mockInsertCat).not.toHaveBeenCalled();
  });

  it("returns 400 when name is missing from body, no D1 write attempted", async () => {
    const res = await handleCreateCat(jsonRequest({ countryCode: "MX" }), fakeDb, PUBLIC_BASE_URL, authed);
    expect(res.status).toBe(400);
    expect(mockInsertCat).not.toHaveBeenCalled();
  });

  it("returns 400 when countryCode is missing from body, no D1 write attempted", async () => {
    const res = await handleCreateCat(jsonRequest({ name: "Mishi" }), fakeDb, PUBLIC_BASE_URL, authed);
    expect(res.status).toBe(400);
    expect(mockInsertCat).not.toHaveBeenCalled();
  });

  it("returns 400 with fixed message when countryCode fails ID-format contract", async () => {
    mockGenerateId.mockImplementation(() => { throw new Error("some internal detail"); });
    const res = await handleCreateCat(jsonRequest({ name: "Mishi", countryCode: "mx" }), fakeDb, PUBLIC_BASE_URL, authed);
    expect(res.status).toBe(400);
    const body = await res.text();
    expect(body).toBe("Invalid countryCode");
    expect(mockInsertCat).not.toHaveBeenCalled();
  });

  it("successful create: publicId matches pattern and qrUrl is correct", async () => {
    mockInsertCat.mockResolvedValue(undefined);
    const res = await handleCreateCat(jsonRequest({ name: "Mishi", countryCode: "MX" }), fakeDb, PUBLIC_BASE_URL, authed);
    expect(res.status).toBe(201);
    const json = await res.json() as { publicId: string; qrUrl: string };
    // The real generateId runs (mock may not intercept external packages in
    // the workers pool), so assert shape rather than exact value.
    expect(json.publicId).toMatch(/^MP-MX-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
    expect(json.qrUrl).toBe(`${PUBLIC_BASE_URL}/c/${json.publicId}`);
  });

  it("retries exactly 5 times on UNIQUE violation, then returns 500", async () => {
    mockInsertCat.mockRejectedValue(new Error("UNIQUE constraint failed: cats.public_id"));
    const res = await handleCreateCat(jsonRequest({ name: "Mishi", countryCode: "MX" }), fakeDb, PUBLIC_BASE_URL, authed);
    expect(res.status).toBe(500);
    expect(mockInsertCat).toHaveBeenCalledTimes(5);
  });
});

// ---------------------------------------------------------------------------
// GET /c/:publicId
// ---------------------------------------------------------------------------

describe("handlePublicProfile", () => {
  it("returns 404 for malformed ID (validateId returns false), getCatPublicProfile never called", async () => {
    mockValidateId.mockReturnValue(false);
    const res = await handlePublicProfile("bad-id", fakeDb);
    expect(res.status).toBe(404);
    expect(mockGetCatPublicProfile).not.toHaveBeenCalled();
  });

  it("returns 404 for well-formed but nonexistent ID", async () => {
    mockValidateId.mockReturnValue(true);
    mockGetCatPublicProfile.mockResolvedValue(null);
    const res = await handlePublicProfile("MP-MX-0000-0000", fakeDb);
    expect(res.status).toBe(404);
  });

  it("returns 200 with placeholder for non-active mode, never 500", async () => {
    mockValidateId.mockReturnValue(true);
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: "MP-MX-0000-0001",
      name: "Luna",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "vet",
    });
    const res = await handlePublicProfile("MP-MX-0000-0001", fakeDb);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Luna");
    expect(html).toContain("isn't available yet");
  });

  it("HTML-escapes <script> in cat name (raw tag never appears unescaped)", async () => {
    mockValidateId.mockReturnValue(true);
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: "MP-MX-0000-0002",
      name: '<script>alert("xss")</script>',
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "active",
    });
    mockGetContactSettingsPublic.mockResolvedValue(null);
    const res = await handlePublicProfile("MP-MX-0000-0002", fakeDb);
    const html = await res.text();
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("HTML-escapes single quotes in cat name to &#39;", async () => {
    mockValidateId.mockReturnValue(true);
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: "MP-MX-0000-0003",
      name: "O'Malley",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "active",
    });
    mockGetContactSettingsPublic.mockResolvedValue(null);
    const res = await handlePublicProfile("MP-MX-0000-0003", fakeDb);
    const html = await res.text();
    expect(html).not.toContain("O'Malley");
    expect(html).toContain("O&#39;Malley");
  });

  it("active-profile response includes X-Content-Type-Options: nosniff header", async () => {
    mockValidateId.mockReturnValue(true);
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: "MP-MX-0000-0004",
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "active",
    });
    mockGetContactSettingsPublic.mockResolvedValue(null);
    const res = await handlePublicProfile("MP-MX-0000-0004", fakeDb);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("unbuilt-mode response includes X-Content-Type-Options: nosniff header", async () => {
    mockValidateId.mockReturnValue(true);
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: "MP-MX-0000-0005",
      name: "Luna",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "vet",
    });
    const res = await handlePublicProfile("MP-MX-0000-0005", fakeDb);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
});
