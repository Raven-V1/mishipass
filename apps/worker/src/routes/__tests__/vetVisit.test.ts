/**
 * Vet Visit route handler unit tests.
 *
 * Covers:
 * - Owner activation (auth gating, ownership, session creation)
 * - Owner cancellation (returns to active)
 * - Public vet form rendering (active session, expired session)
 * - Save & Finish (saves record, returns to active, rejects expired/finished)
 * - No medical/cartilla data exposed publicly
 * - No internal IDs in HTML
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  handleStartVetVisit,
  handleCancelVetVisit,
  handleVetVisitFinish,
  renderVetVisitPage,
} from "../vetVisit.js";
import type { RequestContext } from "../../middleware/session.js";

// -- Mocks ------------------------------------------------------------------

const mockUpdateCatMode = vi.fn();
const mockInsertVetSession = vi.fn();
const mockFindLatestVetSession = vi.fn();
const mockFinishVetSession = vi.fn();
const mockGetCatPublicProfile = vi.fn();

vi.mock("../../db/index.js", () => ({
  updateCatMode: (...args: unknown[]) => mockUpdateCatMode(...args),
  insertVetSession: (...args: unknown[]) => mockInsertVetSession(...args),
  findLatestVetSession: (...args: unknown[]) => mockFindLatestVetSession(...args),
  finishVetSession: (...args: unknown[]) => mockFinishVetSession(...args),
  getCatPublicProfile: (...args: unknown[]) => mockGetCatPublicProfile(...args),
}));

const mockValidateId = vi.fn();

vi.mock("@mishipass/shared-validation", () => ({
  validateId: (...args: unknown[]) => mockValidateId(...args),
}));

const fakeDb = {
  prepare: vi.fn().mockReturnValue({
    bind: vi.fn().mockReturnValue({
      run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
      first: vi.fn().mockResolvedValue(null),
    }),
  }),
} as unknown as D1Database;

const TEST_CAT_ID = "MP-MX-7X3B-9K21";
const authed: RequestContext = { ownerId: 1 };
const unauthed: RequestContext = { ownerId: null };

beforeEach(() => {
  mockUpdateCatMode.mockReset();
  mockInsertVetSession.mockReset();
  mockFindLatestVetSession.mockReset();
  mockFinishVetSession.mockReset();
  mockGetCatPublicProfile.mockReset();
  mockValidateId.mockReset();
  mockValidateId.mockReturnValue(true);
});

// ---------------------------------------------------------------------------
// POST /api/cats/:publicId/vet-visit/start — Owner activation
// ---------------------------------------------------------------------------

describe("handleStartVetVisit", () => {
  it("returns 401 without auth", async () => {
    const res = await handleStartVetVisit(TEST_CAT_ID, fakeDb, unauthed);
    expect(res.status).toBe(401);
    expect(mockUpdateCatMode).not.toHaveBeenCalled();
    expect(mockInsertVetSession).not.toHaveBeenCalled();
  });

  it("returns 404 for invalid public ID format", async () => {
    mockValidateId.mockReturnValue(false);
    const res = await handleStartVetVisit("bad-id", fakeDb, authed);
    expect(res.status).toBe(404);
    expect(mockUpdateCatMode).not.toHaveBeenCalled();
  });

  it("returns 403 when cat does not belong to owner", async () => {
    mockUpdateCatMode.mockResolvedValue(false);
    const res = await handleStartVetVisit(TEST_CAT_ID, fakeDb, authed);
    expect(res.status).toBe(403);
    expect(mockInsertVetSession).not.toHaveBeenCalled();
  });

  it("returns 200 and creates vet session on success", async () => {
    mockUpdateCatMode.mockResolvedValue(true);
    mockInsertVetSession.mockResolvedValue(undefined);
    const res = await handleStartVetVisit(TEST_CAT_ID, fakeDb, authed);
    expect(res.status).toBe(200);
    const json = await res.json() as { status: string; expires_at: string };
    expect(json.status).toBe("vet_visit_active");
    expect(json.expires_at).toBeTruthy();
    expect(json).not.toHaveProperty("id");
    expect(json).not.toHaveProperty("cat_id");
    expect(json).not.toHaveProperty("owner_id");
    expect(mockUpdateCatMode).toHaveBeenCalledWith(fakeDb, TEST_CAT_ID, 1, "vet");
    expect(mockInsertVetSession).toHaveBeenCalledWith(
      fakeDb,
      expect.objectContaining({
        catPublicId: TEST_CAT_ID,
        ownerId: 1,
        token_hash: null,
        status: "active",
      }),
    );
  });

  it("non-owner cannot start vet visit for another owner's cat", async () => {
    mockUpdateCatMode.mockResolvedValue(false);
    const otherOwner: RequestContext = { ownerId: 999 };
    const res = await handleStartVetVisit(TEST_CAT_ID, fakeDb, otherOwner);
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// POST /api/cats/:publicId/vet-visit/cancel — Owner cancellation
// ---------------------------------------------------------------------------

describe("handleCancelVetVisit", () => {
  it("returns 401 without auth", async () => {
    const res = await handleCancelVetVisit(TEST_CAT_ID, fakeDb, unauthed);
    expect(res.status).toBe(401);
  });

  it("returns 404 for invalid public ID format", async () => {
    mockValidateId.mockReturnValue(false);
    const res = await handleCancelVetVisit("bad-id", fakeDb, authed);
    expect(res.status).toBe(404);
    expect(mockUpdateCatMode).not.toHaveBeenCalled();
    expect(mockFinishVetSession).not.toHaveBeenCalled();
  });

  it("returns 403 for non-owner", async () => {
    mockUpdateCatMode.mockResolvedValue(false);
    const res = await handleCancelVetVisit(TEST_CAT_ID, fakeDb, authed);
    expect(res.status).toBe(403);
    expect(mockFinishVetSession).not.toHaveBeenCalled();
  });

  it("returns 200 and switches to active on success", async () => {
    mockUpdateCatMode.mockResolvedValue(true);
    mockFinishVetSession.mockResolvedValue(true);
    const res = await handleCancelVetVisit(TEST_CAT_ID, fakeDb, authed);
    expect(res.status).toBe(200);
    const json = await res.json() as { status: string };
    expect(json.status).toBe("returned_to_active");
    expect(mockUpdateCatMode).toHaveBeenCalledWith(fakeDb, TEST_CAT_ID, 1, "active");
    expect(mockFinishVetSession).toHaveBeenCalledWith(fakeDb, TEST_CAT_ID, 1);
  });
});

// ---------------------------------------------------------------------------
// Public vet visit page rendering
// ---------------------------------------------------------------------------

describe("renderVetVisitPage", () => {
  it("renders vet form when session is active and unexpired", async () => {
    const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    mockFindLatestVetSession.mockResolvedValue({
      token_hash: null,
      activated_at: new Date().toISOString(),
      expires_at: futureExpiry,
      status: "active",
    });
    const res = await renderVetVisitPage(TEST_CAT_ID, "Mishi", "MX", null, fakeDb);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Mishi");
    expect(html).toContain("Vet Visit");
    expect(html).toContain("clinic_name");
    expect(html).toContain("vet_name");
    expect(html).toContain("Save");
    expect(html).toContain("MX");
    // No internal IDs
    expect(html).not.toContain("owner_id");
    expect(html).not.toContain("cat_id");
    // No existing medical history
    expect(html).not.toContain("cartilla");
    expect(html).toContain("Medication Record");
    expect(html).toContain("Vaccine");
    expect(html).toContain('name="vaccine_sticker_photo_capture"');
    expect(html).toContain('capture="environment"');
    expect(html).toContain('name="vaccine_sticker_photo_upload"');
  });

  it("renders expired page when session is expired", async () => {
    mockFindLatestVetSession.mockResolvedValue({
      token_hash: null,
      activated_at: "2020-01-01T00:00:00Z",
      expires_at: "2020-01-02T00:00:00Z",
      status: "active",
    });
    const res = await renderVetVisitPage(TEST_CAT_ID, "Mishi", "MX", null, fakeDb);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("expired");
    expect(html).not.toContain("clinic_name");
  });

  it("renders expired page when session status is finished", async () => {
    const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    mockFindLatestVetSession.mockResolvedValue({
      token_hash: null,
      activated_at: new Date().toISOString(),
      expires_at: futureExpiry,
      status: "finished",
    });
    const res = await renderVetVisitPage(TEST_CAT_ID, "Mishi", "MX", null, fakeDb);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("expired");
  });

  it("renders expired page when no session exists", async () => {
    mockFindLatestVetSession.mockResolvedValue(null);
    const res = await renderVetVisitPage(TEST_CAT_ID, "Mishi", "MX", null, fakeDb);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("expired");
  });

  it("includes nosniff header", async () => {
    const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    mockFindLatestVetSession.mockResolvedValue({
      token_hash: null,
      activated_at: new Date().toISOString(),
      expires_at: futureExpiry,
      status: "active",
    });
    const res = await renderVetVisitPage(TEST_CAT_ID, "Mishi", "MX", null, fakeDb);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("escapes user-controlled cat name and never renders raw R2 object keys", async () => {
    const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    mockFindLatestVetSession.mockResolvedValue({
      token_hash: null,
      activated_at: new Date().toISOString(),
      expires_at: futureExpiry,
      status: "active",
    });
    const res = await renderVetVisitPage(
      TEST_CAT_ID,
      '<script>alert("xss")</script>',
      "MX",
      `cats/${TEST_CAT_ID}/secret-object-key.jpg`,
      fakeDb,
    );
    const html = await res.text();
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain(`/media/cats/${TEST_CAT_ID}/photo`);
    expect(html).not.toContain("secret-object-key");
    expect(html).not.toContain("photo_r2_key");
  });

  it("does not expose owner identity, cartilla history, or private notes on public vet page", async () => {
    const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    mockFindLatestVetSession.mockResolvedValue({
      token_hash: null,
      activated_at: new Date().toISOString(),
      expires_at: futureExpiry,
      status: "active",
    });
    const res = await renderVetVisitPage(TEST_CAT_ID, "Mishi", "MX", null, fakeDb);
    const html = await res.text();
    expect(html).not.toMatch(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    expect(html).not.toContain("owner legal name");
    expect(html).not.toContain("cartilla history");
    expect(html).not.toContain("private notes");
    expect(html).not.toContain("vaccine records");
    expect(html).not.toContain("medication records");
  });

  it("uses neutral visit labels without medical advice or treatment recommendation wording", async () => {
    const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    mockFindLatestVetSession.mockResolvedValue({
      token_hash: null,
      activated_at: new Date().toISOString(),
      expires_at: futureExpiry,
      status: "active",
    });
    const res = await renderVetVisitPage(TEST_CAT_ID, "Mishi", "MX", null, fakeDb);
    const html = await res.text();
    expect(html).toContain("Clinic name");
    expect(html).toContain("Vet name");
    expect(html).not.toMatch(/diagnos|treatment recommendation|dosage|drug interaction|symptom checker/i);
  });

  it("does not contain internal database IDs", async () => {
    const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    mockFindLatestVetSession.mockResolvedValue({
      token_hash: null,
      activated_at: new Date().toISOString(),
      expires_at: futureExpiry,
      status: "active",
    });
    const res = await renderVetVisitPage(TEST_CAT_ID, "Mishi", "MX", null, fakeDb);
    const html = await res.text();
    expect(html).not.toMatch(/\bowner_id\b/);
    expect(html).not.toMatch(/\bcat_id\b/);
    expect(html).not.toMatch(/\bid":\s*\d+/);
  });
});

// ---------------------------------------------------------------------------
// POST /api/cats/:publicId/vet-visit/finish — Save & Finish
// ---------------------------------------------------------------------------

describe("handleVetVisitFinish", () => {
  it("returns 404 for invalid public ID format", async () => {
    mockValidateId.mockReturnValue(false);
    const req = new Request("https://example.com/api/cats/bad/vet-visit/finish", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "clinic_name=Test",
    });
    const res = await handleVetVisitFinish("bad", req, fakeDb);
    expect(res.status).toBe(404);
  });

  it("returns 404 when cat does not exist", async () => {
    mockGetCatPublicProfile.mockResolvedValue(null);
    const req = new Request("https://example.com/api/cats/test/vet-visit/finish", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "clinic_name=Test",
    });
    const res = await handleVetVisitFinish(TEST_CAT_ID, req, fakeDb);
    expect(res.status).toBe(404);
  });

  it("returns 403 when cat is not in vet mode", async () => {
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "active",
    });
    const req = new Request("https://example.com/api/cats/test/vet-visit/finish", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "clinic_name=Test",
    });
    const res = await handleVetVisitFinish(TEST_CAT_ID, req, fakeDb);
    expect(res.status).toBe(403);
  });

  it("returns 403 when cat is in missing mode", async () => {
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "missing",
    });
    const req = new Request("https://example.com/api/cats/test/vet-visit/finish", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "clinic_name=Test",
    });
    const res = await handleVetVisitFinish(TEST_CAT_ID, req, fakeDb);
    expect(res.status).toBe(403);
  });

  it("returns 403 when session is expired", async () => {
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "vet",
    });
    mockFindLatestVetSession.mockResolvedValue({
      token_hash: null,
      activated_at: "2020-01-01T00:00:00Z",
      expires_at: "2020-01-02T00:00:00Z",
      status: "active",
    });
    const req = new Request("https://example.com/api/cats/test/vet-visit/finish", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "clinic_name=Test",
    });
    const res = await handleVetVisitFinish(TEST_CAT_ID, req, fakeDb);
    expect(res.status).toBe(403);
  });

  it("returns 403 when session is already finished", async () => {
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "vet",
    });
    mockFindLatestVetSession.mockResolvedValue({
      token_hash: null,
      activated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: "finished",
    });
    const req = new Request("https://example.com/api/cats/test/vet-visit/finish", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "clinic_name=Test",
    });
    const res = await handleVetVisitFinish(TEST_CAT_ID, req, fakeDb);
    expect(res.status).toBe(403);
  });

  it("saves visit and returns success page when session is active", async () => {
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "vet",
    });
    const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    mockFindLatestVetSession.mockResolvedValue({
      token_hash: null,
      activated_at: new Date().toISOString(),
      expires_at: futureExpiry,
      status: "active",
    });
    const req = new Request("https://example.com/api/cats/test/vet-visit/finish", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "clinic_name=Happy+Paws&vet_name=Dr.+Smith&reason=Checkup&weight=4.2+kg&notes=All+good",
    });
    const res = await handleVetVisitFinish(TEST_CAT_ID, req, fakeDb);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Visit saved");
    expect(html).toContain("Active Profile");
    expect(html).toContain("Mishi");
    // No internal IDs
    expect(html).not.toContain("owner_id");
    expect(html).not.toContain("cat_id");
    expect(fakeDb.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO vet_visits"));
    expect(fakeDb.prepare).toHaveBeenCalledWith(expect.stringContaining("UPDATE vet_sessions"));
    expect(fakeDb.prepare).toHaveBeenCalledWith(expect.stringContaining("UPDATE cats SET current_mode = 'active'"));
  });

  it("saves vaccine, sticker photo, and Medication Record from multipart Vet Visit submission", async () => {
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "vet",
    });
    mockFindLatestVetSession.mockResolvedValue({
      token_hash: null,
      activated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
    });
    const fd = new FormData();
    fd.set("clinic_name", "Happy Paws");
    fd.set("vaccine_name", "FVRCP");
    fd.set("vaccine_date", "2026-07-01");
    fd.set("vaccine_sticker_photo", new File([new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])], "sticker.png", { type: "image/png" }));
    fd.set("medication_name", "Amoxicillin");
    fd.set("medication_dose", "Recorded dose");
    const photos = { put: vi.fn().mockResolvedValue(undefined) } as unknown as R2Bucket & { put: ReturnType<typeof vi.fn> };
    const req = new Request("https://example.com/api/cats/test/vet-visit/finish", { method: "POST", body: fd });
    const res = await handleVetVisitFinish(TEST_CAT_ID, req, fakeDb, photos);
    expect(res.status).toBe(200);
    expect(photos.put).toHaveBeenCalledOnce();
    expect(fakeDb.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO vaccines"));
    expect(fakeDb.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO medications"));
    expect(fakeDb.prepare).toHaveBeenCalledWith(expect.stringContaining("UPDATE cats SET current_mode = 'active'"));
  });

  it("rejects advice-like Medication Record fields in Vet Visit submission", async () => {
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "vet",
    });
    mockFindLatestVetSession.mockResolvedValue({
      token_hash: null,
      activated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
    });
    const req = new Request("https://example.com/api/cats/test/vet-visit/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ medication_name: "Amoxicillin", next_dose: "tomorrow" }),
    });
    const res = await handleVetVisitFinish(TEST_CAT_ID, req, fakeDb);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("Medication Record");
  });

  it("accepts JSON content type", async () => {
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "vet",
    });
    const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    mockFindLatestVetSession.mockResolvedValue({
      token_hash: null,
      activated_at: new Date().toISOString(),
      expires_at: futureExpiry,
      status: "active",
    });
    const req = new Request("https://example.com/api/cats/test/vet-visit/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clinic_name: "Happy Paws", vet_name: "Dr. Smith" }),
    });
    const res = await handleVetVisitFinish(TEST_CAT_ID, req, fakeDb);
    expect(res.status).toBe(200);
  });

  it("returns 400 for malformed JSON without throwing", async () => {
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "vet",
    });
    const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    mockFindLatestVetSession.mockResolvedValue({
      token_hash: null,
      activated_at: new Date().toISOString(),
      expires_at: futureExpiry,
      status: "active",
    });
    const req = new Request("https://example.com/api/cats/test/vet-visit/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    const res = await handleVetVisitFinish(TEST_CAT_ID, req, fakeDb);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Invalid JSON");
  });

  it("returns 400 for unsupported content type without throwing", async () => {
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "vet",
    });
    const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    mockFindLatestVetSession.mockResolvedValue({
      token_hash: null,
      activated_at: new Date().toISOString(),
      expires_at: futureExpiry,
      status: "active",
    });
    const req = new Request("https://example.com/api/cats/test/vet-visit/finish", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "clinic_name=Test",
    });
    const res = await handleVetVisitFinish(TEST_CAT_ID, req, fakeDb);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Unsupported Content-Type");
  });

  it("handles wrong JSON value types deterministically without a 500", async () => {
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "vet",
    });
    const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    mockFindLatestVetSession.mockResolvedValue({
      token_hash: null,
      activated_at: new Date().toISOString(),
      expires_at: futureExpiry,
      status: "active",
    });
    const req = new Request("https://example.com/api/cats/test/vet-visit/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clinic_name: ["array"],
        vet_name: 123,
        reason: { nested: "value" },
        notes: null,
      }),
    });
    const res = await handleVetVisitFinish(TEST_CAT_ID, req, fakeDb);
    expect(res.status).toBe(200);
  });

  it("does not reflect submitted script fields or internal IDs in the success response", async () => {
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: '<img src=x onerror="alert(1)">',
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "vet",
    });
    const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    mockFindLatestVetSession.mockResolvedValue({
      token_hash: null,
      activated_at: new Date().toISOString(),
      expires_at: futureExpiry,
      status: "active",
    });
    const req = new Request("https://example.com/api/cats/test/vet-visit/finish", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "clinic_name=%3Cscript%3Ealert(1)%3C%2Fscript%3E&notes=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E",
    });
    const res = await handleVetVisitFinish(TEST_CAT_ID, req, fakeDb);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("owner_id");
    expect(html).not.toContain("cat_id");
  });

  it("truncates overly long fields", async () => {
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "vet",
    });
    const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    mockFindLatestVetSession.mockResolvedValue({
      token_hash: null,
      activated_at: new Date().toISOString(),
      expires_at: futureExpiry,
      status: "active",
    });
    const longString = "A".repeat(1000);
    const req = new Request("https://example.com/api/cats/test/vet-visit/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clinic_name: longString }),
    });
    // Should not error — just truncates
    const res = await handleVetVisitFinish(TEST_CAT_ID, req, fakeDb);
    expect(res.status).toBe(200);
  });
});
