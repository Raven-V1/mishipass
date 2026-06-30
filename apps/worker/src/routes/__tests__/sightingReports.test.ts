/**
 * Sighting report route handler unit tests.
 *
 * Mocks the DB layer and shared-validation to isolate route logic.
 * Covers form rendering, submission validation, auth gating, rate limiting,
 * XSS prevention, and privacy (no internal IDs in responses).
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  handleSightingForm,
  handleSightingSubmit,
  handleListSightingsForOwner,
} from "../sightingReports.js";
import type { RequestContext } from "../../middleware/session.js";

// -- Mocks ------------------------------------------------------------------

const mockGetCatPublicProfile = vi.fn();
const mockInsertSightingReport = vi.fn();
const mockListSightingReportsForOwner = vi.fn();

vi.mock("../../db/index.js", () => ({
  getCatPublicProfile: (...args: unknown[]) => mockGetCatPublicProfile(...args),
  insertSightingReport: (...args: unknown[]) => mockInsertSightingReport(...args),
  listSightingReportsForOwner: (...args: unknown[]) => mockListSightingReportsForOwner(...args),
}));

const mockValidateId = vi.fn();

vi.mock("@mishipass/shared-validation", () => ({
  validateId: (...args: unknown[]) => mockValidateId(...args),
}));

const mockCheckRateLimit = vi.fn().mockReturnValue(true);

vi.mock("../../middleware/rateLimit.js", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

vi.mock("../../utils/crypto.js", () => ({
  sha256Hex: async (val: string) => "hashed_" + val,
}));

const fakeDb = {} as D1Database;
const TEST_CAT_ID = "MP-MX-0000-0001";

beforeEach(() => {
  mockGetCatPublicProfile.mockReset();
  mockInsertSightingReport.mockReset();
  mockListSightingReportsForOwner.mockReset();
  mockValidateId.mockReset();
  mockCheckRateLimit.mockReset();
  mockCheckRateLimit.mockReturnValue(true);
});

// ---------------------------------------------------------------------------
// GET /c/:publicId/sighting
// ---------------------------------------------------------------------------

describe("handleSightingForm", () => {
  it("returns 404 for nonexistent cat", async () => {
    mockValidateId.mockReturnValue(true);
    mockGetCatPublicProfile.mockResolvedValue(null);
    const res = await handleSightingForm(TEST_CAT_ID, fakeDb);
    expect(res.status).toBe(404);
  });

  it("returns 'not accepting' page for active cat", async () => {
    mockValidateId.mockReturnValue(true);
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "active",
    });
    const res = await handleSightingForm(TEST_CAT_ID, fakeDb);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("This cat is not currently accepting sighting reports.");
  });

  it("returns form HTML for missing cat", async () => {
    mockValidateId.mockReturnValue(true);
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "missing",
    });
    const res = await handleSightingForm(TEST_CAT_ID, fakeDb);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<form");
    expect(html).toContain('name="city"');
    expect(html).toContain(`/c/${TEST_CAT_ID}/sighting`);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("returns 404 for invalid ID format", async () => {
    mockValidateId.mockReturnValue(false);
    const res = await handleSightingForm("bad-id", fakeDb);
    expect(res.status).toBe(404);
    expect(mockGetCatPublicProfile).not.toHaveBeenCalled();
  });

  it("HTML-escapes cat name in the form (XSS prevention)", async () => {
    mockValidateId.mockReturnValue(true);
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: '<script>alert("xss")</script>',
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "missing",
    });
    const res = await handleSightingForm(TEST_CAT_ID, fakeDb);
    const html = await res.text();
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

// ---------------------------------------------------------------------------
// POST /c/:publicId/sighting
// ---------------------------------------------------------------------------

describe("handleSightingSubmit", () => {
  function jsonRequest(body: unknown): Request {
    return new Request(`https://example.com/c/${TEST_CAT_ID}/sighting`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": "1.2.3.4",
      },
      body: JSON.stringify(body),
    });
  }

  function formRequest(params: Record<string, string>): Request {
    const body = new URLSearchParams(params).toString();
    return new Request(`https://example.com/c/${TEST_CAT_ID}/sighting`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "CF-Connecting-IP": "1.2.3.4",
      },
      body,
    });
  }

  it("stores report and returns success for valid data (JSON)", async () => {
    mockValidateId.mockReturnValue(true);
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "missing",
    });
    mockInsertSightingReport.mockResolvedValue(undefined);

    const res = await handleSightingSubmit(
      TEST_CAT_ID,
      jsonRequest({ city: "CDMX", area: "Roma Norte", message: "Seen near park" }),
      fakeDb,
    );
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Thank you. Your sighting report has been submitted.");
    expect(html).toContain(`/c/${TEST_CAT_ID}`);
    expect(mockInsertSightingReport).toHaveBeenCalledWith(fakeDb, {
      catPublicId: TEST_CAT_ID,
      message: "Seen near park",
      location_text: "CDMX, Roma Norte",
      reporter_ip_hash: "hashed_1.2.3.4",
    });
  });

  it("stores report and returns success for valid form data", async () => {
    mockValidateId.mockReturnValue(true);
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "missing",
    });
    mockInsertSightingReport.mockResolvedValue(undefined);

    const res = await handleSightingSubmit(
      TEST_CAT_ID,
      formRequest({ city: "Puebla" }),
      fakeDb,
    );
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Thank you");
    expect(mockInsertSightingReport).toHaveBeenCalledWith(fakeDb, {
      catPublicId: TEST_CAT_ID,
      message: null,
      location_text: "Puebla",
      reporter_ip_hash: "hashed_1.2.3.4",
    });
  });

  it("returns 400 for active cat", async () => {
    mockValidateId.mockReturnValue(true);
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "active",
    });

    const res = await handleSightingSubmit(
      TEST_CAT_ID,
      jsonRequest({ city: "CDMX" }),
      fakeDb,
    );
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toBe("Not accepting reports");
  });

  it("returns 400 when city is missing", async () => {
    mockValidateId.mockReturnValue(true);
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "missing",
    });

    const res = await handleSightingSubmit(
      TEST_CAT_ID,
      jsonRequest({ area: "Roma" }),
      fakeDb,
    );
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toContain("City");
  });

  it("returns 400 when city exceeds 80 characters", async () => {
    mockValidateId.mockReturnValue(true);
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "missing",
    });

    const longCity = "A".repeat(81);
    const res = await handleSightingSubmit(
      TEST_CAT_ID,
      jsonRequest({ city: longCity }),
      fakeDb,
    );
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toContain("City");
  });

  it("returns 404 for nonexistent cat", async () => {
    mockValidateId.mockReturnValue(true);
    mockGetCatPublicProfile.mockResolvedValue(null);

    const res = await handleSightingSubmit(
      TEST_CAT_ID,
      jsonRequest({ city: "CDMX" }),
      fakeDb,
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 for invalid ID format", async () => {
    mockValidateId.mockReturnValue(false);

    const res = await handleSightingSubmit(
      "bad-id",
      jsonRequest({ city: "CDMX" }),
      fakeDb,
    );
    expect(res.status).toBe(404);
    expect(mockGetCatPublicProfile).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Rate limiting (with separate mock to test rejection)
// ---------------------------------------------------------------------------

describe("handleSightingSubmit — rate limiting", () => {
  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockReturnValue(false);

    mockValidateId.mockReturnValue(true);
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "missing",
    });

    const req = new Request(`https://example.com/c/${TEST_CAT_ID}/sighting`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": "1.2.3.4",
      },
      body: JSON.stringify({ city: "CDMX" }),
    });
    const res = await handleSightingSubmit(TEST_CAT_ID, req, fakeDb);
    expect(res.status).toBe(429);
    const json = await res.json() as { error: string };
    expect(json.error).toContain("Too many reports");
  });
});

// ---------------------------------------------------------------------------
// GET /api/cats/:publicId/sightings
// ---------------------------------------------------------------------------

describe("handleListSightingsForOwner", () => {
  it("returns 401 when unauthenticated", async () => {
    const ctx: RequestContext = { ownerId: null };
    const res = await handleListSightingsForOwner(TEST_CAT_ID, fakeDb, ctx);
    expect(res.status).toBe(401);
  });

  it("returns reports array with safe fields only", async () => {
    const ctx: RequestContext = { ownerId: 1 };
    mockListSightingReportsForOwner.mockResolvedValue([
      {
        message: "Seen in park",
        photo_r2_key: null,
        location_text: "CDMX, Roma Norte",
        created_at: "2024-01-15T10:00:00Z",
      },
    ]);
    const res = await handleListSightingsForOwner(TEST_CAT_ID, fakeDb, ctx);
    expect(res.status).toBe(200);
    const json = await res.json() as Array<Record<string, unknown>>;
    expect(json).toHaveLength(1);
    expect(json[0]).toEqual({
      message: "Seen in park",
      location_text: "CDMX, Roma Norte",
      created_at: "2024-01-15T10:00:00Z",
    });
    // No internal IDs
    expect(json[0]).not.toHaveProperty("id");
    expect(json[0]).not.toHaveProperty("cat_id");
    expect(json[0]).not.toHaveProperty("reporter_ip_hash");
    expect(json[0]).not.toHaveProperty("photo_r2_key");
  });
});
