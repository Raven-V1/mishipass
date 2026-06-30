import { describe, expect, it, vi, beforeEach } from "vitest";
import { handleGetContactSettings, handleUpsertContactSettings } from "../contactSettings.js";
import type { RequestContext } from "../../middleware/session.js";

const mockGetContactSettingsForOwner = vi.fn();
const mockUpsertContactSettings = vi.fn();

vi.mock("../../db/index.js", () => ({
  getContactSettingsForOwner: (...args: unknown[]) => mockGetContactSettingsForOwner(...args),
  upsertContactSettings: (...args: unknown[]) => mockUpsertContactSettings(...args),
}));

const fakeDb = {} as D1Database;
const TEST_CAT_ID = "MP-MX-0000-0001";

beforeEach(() => {
  mockGetContactSettingsForOwner.mockReset();
  mockUpsertContactSettings.mockReset();
});

describe("handleGetContactSettings", () => {
  it("returns 401 when unauthenticated", async () => {
    const ctx: RequestContext = { ownerId: null };
    const res = await handleGetContactSettings(TEST_CAT_ID, fakeDb, ctx);
    expect(res.status).toBe(401);
  });

  it("returns default settings when none exist", async () => {
    const ctx: RequestContext = { ownerId: 1 };
    mockGetContactSettingsForOwner.mockResolvedValue(null);
    const res = await handleGetContactSettings(TEST_CAT_ID, fakeDb, ctx);
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.contact_mode).toBe("relay");
    expect(json.public_phone).toBeNull();
  });

  it("returns saved settings", async () => {
    const ctx: RequestContext = { ownerId: 1 };
    mockGetContactSettingsForOwner.mockResolvedValue({
      contact_mode: "phone",
      public_phone: "+521234567890",
    });
    const res = await handleGetContactSettings(TEST_CAT_ID, fakeDb, ctx);
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.contact_mode).toBe("phone");
    expect(json.public_phone).toBe("+521234567890");
  });

  it("does not expose internal IDs", async () => {
    const ctx: RequestContext = { ownerId: 1 };
    mockGetContactSettingsForOwner.mockResolvedValue({
      contact_mode: "relay",
      public_phone: null,
    });
    const res = await handleGetContactSettings(TEST_CAT_ID, fakeDb, ctx);
    const json = await res.json() as Record<string, unknown>;
    expect(json).not.toHaveProperty("id");
    expect(json).not.toHaveProperty("cat_id");
    expect(json).not.toHaveProperty("owner_id");
  });
});

describe("handleUpsertContactSettings", () => {
  it("returns 401 when unauthenticated", async () => {
    const ctx: RequestContext = { ownerId: null };
    const req = new Request("https://example.com/api/cats/x/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_mode: "none" }),
    });
    const res = await handleUpsertContactSettings(TEST_CAT_ID, req, fakeDb, ctx);
    expect(res.status).toBe(401);
  });

  it("saves valid settings", async () => {
    const ctx: RequestContext = { ownerId: 1 };
    mockUpsertContactSettings.mockResolvedValue(undefined);
    const req = new Request("https://example.com/api/cats/x/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_mode: "phone", public_phone: "+52999" }),
    });
    const res = await handleUpsertContactSettings(TEST_CAT_ID, req, fakeDb, ctx);
    expect(res.status).toBe(200);
    expect(mockUpsertContactSettings).toHaveBeenCalledWith(
      fakeDb, TEST_CAT_ID, 1,
      { contact_mode: "phone", public_phone: "+52999" }
    );
  });

  it("defaults to relay for invalid mode", async () => {
    const ctx: RequestContext = { ownerId: 1 };
    mockUpsertContactSettings.mockResolvedValue(undefined);
    const req = new Request("https://example.com/api/cats/x/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_mode: "invalid_mode" }),
    });
    const res = await handleUpsertContactSettings(TEST_CAT_ID, req, fakeDb, ctx);
    expect(res.status).toBe(200);
    expect(mockUpsertContactSettings).toHaveBeenCalledWith(
      fakeDb, TEST_CAT_ID, 1,
      { contact_mode: "relay", public_phone: null }
    );
  });
});
