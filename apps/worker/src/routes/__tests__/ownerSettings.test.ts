import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleGetOwnerSettings, handleUpsertOwnerSettings } from "../ownerSettings.js";
import type { RequestContext } from "../../middleware/session.js";

const mockGetOwnerSettings = vi.fn();
const mockUpsertOwnerSettings = vi.fn();

vi.mock("../../db/index.js", () => ({
  getOwnerSettings: (...args: unknown[]) => mockGetOwnerSettings(...args),
  isOwnerLanguageCode: (value: string) => value === "en" || value === "es" || value === "kk-KZ",
  upsertOwnerSettings: (...args: unknown[]) => mockUpsertOwnerSettings(...args),
}));

const fakeDb = {} as D1Database;

beforeEach(() => {
  mockGetOwnerSettings.mockReset();
  mockUpsertOwnerSettings.mockReset();
});

describe("owner settings routes", () => {
  const authed: RequestContext = { ownerId: 7 };
  const unauthed: RequestContext = { ownerId: null };

  it("returns 401 without auth", async () => {
    expect((await handleGetOwnerSettings(fakeDb, unauthed)).status).toBe(401);
  });

  it("returns saved language preference without internal ids", async () => {
    mockGetOwnerSettings.mockResolvedValue({ language_code: "kk-KZ" });
    const res = await handleGetOwnerSettings(fakeDb, authed);
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json).toEqual({ language_code: "kk-KZ" });
    expect(json).not.toHaveProperty("owner_id");
  });

  it("saves allowed language values", async () => {
    const req = new Request("https://example.com/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language_code: "es" }),
    });
    const res = await handleUpsertOwnerSettings(req, fakeDb, authed);
    expect(res.status).toBe(200);
    expect(mockUpsertOwnerSettings).toHaveBeenCalledWith(fakeDb, 7, "es");
  });

  it("rejects unsupported language values", async () => {
    const req = new Request("https://example.com/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language_code: "fr" }),
    });
    const res = await handleUpsertOwnerSettings(req, fakeDb, authed);
    expect(res.status).toBe(400);
    expect(mockUpsertOwnerSettings).not.toHaveBeenCalled();
  });
});
