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

const mockCheckDurableRateLimit = vi.fn().mockResolvedValue(true);

vi.mock("../../middleware/durableRateLimit.js", () => ({
  checkDurableRateLimit: (...args: unknown[]) => mockCheckDurableRateLimit(...args),
}));

vi.mock("../../utils/crypto.js", () => ({
  sha256Hex: async (val: string) => "hashed_" + val,
  hmacSha256Hex: async (_val: string, _secret: string) =>
    "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
}));

const fakeDb = {} as D1Database;
const fakePhotos = {} as R2Bucket;
const TEST_CAT_ID = "MP-MX-0000-0001";

beforeEach(() => {
  mockGetCatPublicProfile.mockReset();
  mockInsertSightingReport.mockReset();
  mockListSightingReportsForOwner.mockReset();
  mockValidateId.mockReset();
  mockCheckRateLimit.mockReset();
  mockCheckRateLimit.mockReturnValue(true);
  mockCheckDurableRateLimit.mockReset();
  mockCheckDurableRateLimit.mockResolvedValue(true);
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
    expect(html).toContain('name="photoCapture"');
    expect(html).toContain('capture="environment"');
    expect(html).toContain('name="photoUpload"');
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("returns 404 for invalid ID format", async () => {
    mockGetCatPublicProfile.mockResolvedValue(null);
    const res = await handleSightingForm("bad-id", fakeDb);
    expect(res.status).toBe(404);
    expect(mockGetCatPublicProfile).toHaveBeenCalledWith(fakeDb, "bad-id");
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
      fakePhotos,
      "test-secret",
    );
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Thank you. Your sighting report has been submitted.");
    expect(html).toContain(`/c/${TEST_CAT_ID}`);
    expect(mockInsertSightingReport).toHaveBeenCalledWith(fakeDb, {
      catPublicId: TEST_CAT_ID,
      message: "Seen near park",
      location_text: "CDMX, Roma Norte",
      reporter_ip_hash: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      photo_r2_key: null,
    });
    expect(mockCheckDurableRateLimit).toHaveBeenCalledWith(
      fakeDb,
      `sighting:abcdef1234567890:${TEST_CAT_ID}`,
      5,
      10,
    );
    expect(mockCheckDurableRateLimit.mock.calls[0]![1]).not.toContain("1.2.3.4");
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
      fakePhotos,
      "test-secret",
    );
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Thank you");
    expect(mockInsertSightingReport).toHaveBeenCalledWith(fakeDb, {
      catPublicId: TEST_CAT_ID,
      message: null,
      location_text: "Puebla",
      reporter_ip_hash: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      photo_r2_key: null,
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
      fakePhotos,
      "test-secret",
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
      fakePhotos,
      "test-secret",
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
      fakePhotos,
      "test-secret",
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
      fakePhotos,
      "test-secret",
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 for invalid ID format", async () => {
    mockValidateId.mockReturnValue(false);

    const res = await handleSightingSubmit(
      "bad-id",
      jsonRequest({ city: "CDMX" }),
      fakeDb,
      fakePhotos,
      "test-secret",
    );
    expect(res.status).toBe(404);
    expect(mockGetCatPublicProfile).not.toHaveBeenCalled();
  });

  it("returns 503 when HMAC secret is missing", async () => {
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
      jsonRequest({ city: "CDMX" }),
      fakeDb,
      fakePhotos,
    );
    expect(res.status).toBe(503);
    const json = await res.json() as { error: string };
    expect(json.error).toBe("Service configuration error");
    expect(mockCheckDurableRateLimit).not.toHaveBeenCalled();
  });

  it("rejects multipart sighting photos whose magic bytes do not match declared type", async () => {
    mockValidateId.mockReturnValue(true);
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "missing",
    });
    const formData = new FormData();
    formData.set("city", "CDMX");
    formData.set("photo", new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "fake.png", { type: "image/png" }));
    const req = new Request(`https://example.com/c/${TEST_CAT_ID}/sighting`, {
      method: "POST",
      headers: { "CF-Connecting-IP": "1.2.3.4" },
      body: formData,
    });

    const res = await handleSightingSubmit(TEST_CAT_ID, req, fakeDb, fakePhotos, "test-secret");

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Photo content does not match declared type" });
    expect(mockInsertSightingReport).not.toHaveBeenCalled();
  });

  it("uploads valid multipart sighting photos to R2 and stores only the object key", async () => {
    mockValidateId.mockReturnValue(true);
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "missing",
    });
    mockInsertSightingReport.mockResolvedValue(undefined);
    const photos = {
      put: vi.fn().mockResolvedValue(undefined),
    } as unknown as R2Bucket & { put: ReturnType<typeof vi.fn> };
    const formData = new FormData();
    formData.set("city", "CDMX");
    formData.set(
      "photo",
      new File([new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])], "sighting.png", { type: "image/png" }),
    );
    const req = new Request(`https://example.com/c/${TEST_CAT_ID}/sighting`, {
      method: "POST",
      headers: { "CF-Connecting-IP": "1.2.3.4" },
      body: formData,
    });

    const res = await handleSightingSubmit(TEST_CAT_ID, req, fakeDb, photos, "test-secret");

    expect(res.status).toBe(200);
    expect(photos.put).toHaveBeenCalledOnce();
    const photoKey = photos.put.mock.calls[0]![0] as string;
    expect(photoKey).toMatch(new RegExp(`^sightings/${TEST_CAT_ID}/[a-f0-9]{32}\\.png$`));
    expect(mockInsertSightingReport).toHaveBeenCalledWith(fakeDb, expect.objectContaining({
      photo_r2_key: photoKey,
      reporter_ip_hash: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    }));
    const html = await res.text();
    expect(html).not.toContain(photoKey);
    expect(html).not.toContain("photo_r2_key");
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
    const res = await handleSightingSubmit(TEST_CAT_ID, req, fakeDb, fakePhotos, "test-secret");
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
