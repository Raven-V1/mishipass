/**
 * GET /api/cats route handler unit tests.
 *
 * Mocks the DB layer to isolate route logic.
 * Covers auth gating, response shape, and privacy (no internal IDs).
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { handleListCats } from "../cats.js";
import type { RequestContext } from "../../middleware/session.js";

// -- Mocks ------------------------------------------------------------------

const mockListCatsForOwner = vi.fn();

vi.mock("../../db/index.js", () => ({
  listCatsForOwner: (...args: unknown[]) => mockListCatsForOwner(...args),
  getCatPublicProfile: vi.fn(),
  getContactSettingsPublic: vi.fn(),
  getMissingAlertPublic: vi.fn(),
  insertCat: vi.fn(),
}));

vi.mock("@mishipass/shared-validation", () => ({
  generateId: vi.fn(),
  validateId: vi.fn(),
}));

const fakeDb = {} as D1Database;
const PUBLIC_BASE_URL = "https://mishipass.example.com";

beforeEach(() => {
  mockListCatsForOwner.mockReset();
});

// ---------------------------------------------------------------------------

describe("handleListCats", () => {
  const authed: RequestContext = { ownerId: 42 };
  const unauthed: RequestContext = { ownerId: null };

  it("returns 401 when unauthenticated", async () => {
    const res = await handleListCats(fakeDb, PUBLIC_BASE_URL, unauthed);
    expect(res.status).toBe(401);
    expect(mockListCatsForOwner).not.toHaveBeenCalled();
  });

  it("returns 200 with array of cat objects when authenticated", async () => {
    mockListCatsForOwner.mockResolvedValue([
      {
        public_id: "MP-MX-1234-ABCD",
        name: "Mishi",
        country_code: "MX",
        photo_r2_key: null,
        current_mode: "active",
      },
      {
        public_id: "MP-ES-5678-EFGH",
        name: "Luna",
        country_code: "ES",
        photo_r2_key: "some-key.jpg",
        current_mode: "missing",
      },
    ]);

    const res = await handleListCats(fakeDb, PUBLIC_BASE_URL, authed);
    expect(res.status).toBe(200);

    const json = (await res.json()) as Array<Record<string, unknown>>;
    expect(json).toHaveLength(2);

    expect(json[0]).toEqual({
      publicId: "MP-MX-1234-ABCD",
      name: "Mishi",
      countryCode: "MX",
      currentMode: "active",
      qrUrl: "https://mishipass.example.com/c/MP-MX-1234-ABCD",
    });

    expect(json[1]).toEqual({
      publicId: "MP-ES-5678-EFGH",
      name: "Luna",
      countryCode: "ES",
      currentMode: "missing",
      qrUrl: "https://mishipass.example.com/c/MP-ES-5678-EFGH",
    });
  });

  it("response objects do not contain internal numeric id key", async () => {
    mockListCatsForOwner.mockResolvedValue([
      {
        public_id: "MP-MX-1234-ABCD",
        name: "Mishi",
        country_code: "MX",
        photo_r2_key: null,
        current_mode: "active",
      },
    ]);

    const res = await handleListCats(fakeDb, PUBLIC_BASE_URL, authed);
    const json = (await res.json()) as Array<Record<string, unknown>>;

    for (const cat of json) {
      expect(cat).not.toHaveProperty("id");
      expect(cat).not.toHaveProperty("owner_id");
      expect(cat).not.toHaveProperty("photo_r2_key");
    }
  });

  it("returns empty array when owner has no cats", async () => {
    mockListCatsForOwner.mockResolvedValue([]);

    const res = await handleListCats(fakeDb, PUBLIC_BASE_URL, authed);
    expect(res.status).toBe(200);
    const json = (await res.json()) as Array<Record<string, unknown>>;
    expect(json).toEqual([]);
  });
});
