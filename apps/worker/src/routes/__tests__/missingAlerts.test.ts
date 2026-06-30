/**
 * Missing Alert route handler unit tests.
 *
 * Mocks the DB layer and shared-validation to isolate route logic.
 * Covers auth gating, ownership checks, reward visibility, and privacy.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { handleSwitchToMissing, handleSwitchToActive } from "../missingAlerts.js";
import { handlePublicProfile } from "../cats.js";
import type { RequestContext } from "../../middleware/session.js";

// -- Mocks ------------------------------------------------------------------

const mockUpdateCatMode = vi.fn();
const mockUpsertMissingAlert = vi.fn();
const mockGetCatPublicProfile = vi.fn();
const mockGetContactSettingsPublic = vi.fn();
const mockGetMissingAlertPublic = vi.fn();
const mockInsertCat = vi.fn();

vi.mock("../../db/index.js", () => ({
  updateCatMode: (...args: unknown[]) => mockUpdateCatMode(...args),
  upsertMissingAlert: (...args: unknown[]) => mockUpsertMissingAlert(...args),
  getCatPublicProfile: (...args: unknown[]) => mockGetCatPublicProfile(...args),
  getContactSettingsPublic: (...args: unknown[]) => mockGetContactSettingsPublic(...args),
  getMissingAlertPublic: (...args: unknown[]) => mockGetMissingAlertPublic(...args),
  insertCat: (...args: unknown[]) => mockInsertCat(...args),
}));

const mockValidateId = vi.fn();

vi.mock("@mishipass/shared-validation", () => ({
  generateId: () => "MP-MX-0000-0001",
  validateId: (...args: unknown[]) => mockValidateId(...args),
}));

const fakeDb = {} as D1Database;
const PUBLIC_BASE_URL = "https://mishipass.example.com";
const TEST_CAT_ID = "MP-MX-0000-0001";

function jsonRequest(body: unknown): Request {
  return new Request(`https://example.com/api/cats/${TEST_CAT_ID}/missing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockUpdateCatMode.mockReset();
  mockUpsertMissingAlert.mockReset();
  mockGetCatPublicProfile.mockReset();
  mockGetContactSettingsPublic.mockReset();
  mockGetMissingAlertPublic.mockReset();
  mockInsertCat.mockReset();
  mockValidateId.mockReset();
});

// ---------------------------------------------------------------------------
// POST /api/cats/:catId/missing
// ---------------------------------------------------------------------------

describe("handleSwitchToMissing", () => {
  const authed: RequestContext = { ownerId: 1 };
  const unauthed: RequestContext = { ownerId: null };

  it("returns 401 without auth, no D1 write attempted", async () => {
    const req = jsonRequest({ city: "CDMX", area: "Roma Norte", lastSeenAt: "2024-01-15" });
    const res = await handleSwitchToMissing(req, TEST_CAT_ID, fakeDb, PUBLIC_BASE_URL, unauthed);
    expect(res.status).toBe(401);
    expect(mockUpdateCatMode).not.toHaveBeenCalled();
    expect(mockUpsertMissingAlert).not.toHaveBeenCalled();
  });

  it("returns 403 for non-owner (updateCatMode returns false)", async () => {
    mockUpdateCatMode.mockResolvedValue(false);
    const req = jsonRequest({ city: "CDMX", area: "Roma Norte", lastSeenAt: "2024-01-15" });
    const res = await handleSwitchToMissing(req, TEST_CAT_ID, fakeDb, PUBLIC_BASE_URL, authed);
    expect(res.status).toBe(403);
    expect(mockUpsertMissingAlert).not.toHaveBeenCalled();
  });

  it("returns 200 with correct alert URL on success", async () => {
    mockUpdateCatMode.mockResolvedValue(true);
    mockUpsertMissingAlert.mockResolvedValue(undefined);
    const req = jsonRequest({
      city: "CDMX",
      area: "Roma Norte",
      lastSeenAt: "2024-01-15",
      rewardAmount: "500",
      rewardVisible: true,
    });
    const res = await handleSwitchToMissing(req, TEST_CAT_ID, fakeDb, PUBLIC_BASE_URL, authed);
    expect(res.status).toBe(200);
    const json = await res.json() as { qrUrl: string };
    expect(json.qrUrl).toBe(`${PUBLIC_BASE_URL}/c/${TEST_CAT_ID}`);
    expect(mockUpdateCatMode).toHaveBeenCalledWith(fakeDb, TEST_CAT_ID, 1, "missing");
    expect(mockUpsertMissingAlert).toHaveBeenCalledWith(
      fakeDb,
      TEST_CAT_ID,
      1,
      expect.objectContaining({
        city: "CDMX",
        area: "Roma Norte",
        last_seen_at: "2024-01-15",
        reward_amount: "500",
        reward_visible: 1,
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// POST /api/cats/:catId/active
// ---------------------------------------------------------------------------

describe("handleSwitchToActive", () => {
  const authed: RequestContext = { ownerId: 1 };
  const unauthed: RequestContext = { ownerId: null };

  it("returns 200, alert history preserved (not deleted)", async () => {
    mockUpdateCatMode.mockResolvedValue(true);
    const req = new Request(`https://example.com/api/cats/${TEST_CAT_ID}/active`, {
      method: "POST",
    });
    const res = await handleSwitchToActive(req, TEST_CAT_ID, fakeDb, authed);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({});
    expect(mockUpdateCatMode).toHaveBeenCalledWith(fakeDb, TEST_CAT_ID, 1, "active");
  });

  it("returns 403 for non-owner", async () => {
    mockUpdateCatMode.mockResolvedValue(false);
    const req = new Request(`https://example.com/api/cats/${TEST_CAT_ID}/active`, {
      method: "POST",
    });
    const res = await handleSwitchToActive(req, TEST_CAT_ID, fakeDb, authed);
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Public missing profile (GET /c/:publicId with missing mode)
// ---------------------------------------------------------------------------

describe("handlePublicProfile — missing mode", () => {
  it("omits reward when getMissingAlertPublic returns reward_amount: null", async () => {
    mockValidateId.mockReturnValue(true);
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "missing",
    });
    mockGetMissingAlertPublic.mockResolvedValue({
      last_seen_at: "2024-01-15",
      city: "CDMX",
      area: "Roma Norte",
      reward_amount: null,
      activated_at: "2024-01-15T10:00:00Z",
    });

    const res = await handlePublicProfile(TEST_CAT_ID, fakeDb);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Mishi");
    expect(html).toContain("CDMX");
    expect(html).toContain("Roma Norte");
    expect(html).not.toContain("Reward");
  });

  it("shows reward when getMissingAlertPublic returns reward_amount: '500'", async () => {
    mockValidateId.mockReturnValue(true);
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "missing",
    });
    mockGetMissingAlertPublic.mockResolvedValue({
      last_seen_at: "2024-01-15",
      city: "CDMX",
      area: "Roma Norte",
      reward_amount: "500",
      activated_at: "2024-01-15T10:00:00Z",
    });

    const res = await handlePublicProfile(TEST_CAT_ID, fakeDb);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Reward");
    expect(html).toContain("500");
  });

  it("never includes owner name or exact address in rendered HTML", async () => {
    mockValidateId.mockReturnValue(true);
    mockGetCatPublicProfile.mockResolvedValue({
      public_id: TEST_CAT_ID,
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "missing",
    });
    mockGetMissingAlertPublic.mockResolvedValue({
      last_seen_at: "2024-01-15",
      city: "CDMX",
      area: "Roma Norte",
      reward_amount: "500",
      activated_at: "2024-01-15T10:00:00Z",
    });

    const res = await handlePublicProfile(TEST_CAT_ID, fakeDb);
    const html = await res.text();
    // Constitution Section 7: no owner name or address public
    expect(html).not.toContain("owner");
    expect(html).not.toContain("address");
    expect(html).not.toContain("owner_id");
    expect(html).not.toContain("owner_name");
  });
});
