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

  it("returns 403 for non-owner", async () => {
    mockUpdateCatMode.mockResolvedValue(false);
    const res = await handleCancelVetVisit(TEST_CAT_ID, fakeDb, authed);
    expect(res.status).toBe(403);
  });

  it("returns 200 and switches to active on success", async () => {
    mockUpdateCatMode.mockResolvedValue(true);
    mockFinishVetSession.mockResolvedValue(true);
    const res = await handleCancelVetVisit(TEST_CAT_ID, fakeDb, authed);
    expect(res.status).toBe(200);
    const json = await res.json() as { status: string };
    expect(json.status).toBe("returned_to_active");
    expect(mockUpdateCatMode).toHaveBeenCalledWith(fakeDb, TEST_CAT_ID, 1, "active");
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
    // No medical history
    expect(html).not.toContain("cartilla");
    expect(html).not.toContain("medication");
    expect(html).not.toContain("vaccine");
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
