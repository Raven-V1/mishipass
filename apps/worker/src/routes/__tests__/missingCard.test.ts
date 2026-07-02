import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleMissingCardPage } from "../missingCard.js";
import type { RequestContext } from "../../middleware/session.js";

const mockGetCatForOwner = vi.fn();
const mockGetMissingAlertForOwner = vi.fn();
const mockGetContactSettingsForOwner = vi.fn();

vi.mock("../../db/index.js", () => ({
  getCatForOwner: (...args: unknown[]) => mockGetCatForOwner(...args),
  getMissingAlertForOwner: (...args: unknown[]) => mockGetMissingAlertForOwner(...args),
  getContactSettingsForOwner: (...args: unknown[]) => mockGetContactSettingsForOwner(...args),
}));

vi.mock("@mishipass/shared-validation", () => ({ validateId: () => true }));

const fakeDb = {} as D1Database;
const ctx: RequestContext = { ownerId: 1 };
const ID = "MP-MX-0000-0001";

beforeEach(() => {
  mockGetCatForOwner.mockReset();
  mockGetMissingAlertForOwner.mockReset();
  mockGetContactSettingsForOwner.mockReset();
});

describe("WhatsApp missing card", () => {
  it("generates a privacy-safe card only in Missing mode", async () => {
    mockGetCatForOwner.mockResolvedValue({ public_id: ID, name: "Mishi", current_mode: "missing", photo_r2_key: "private-key" });
    mockGetMissingAlertForOwner.mockResolvedValue({ city: "Almaty", area: "Bostandyk", last_seen_at: "2026-07-01", reward_visible: 1, reward_amount: "100", recovery_board_opt_in: 0, activated_at: "2026-07-01T00:00:00Z" });
    mockGetContactSettingsForOwner.mockResolvedValue({ contact_mode: "relay", public_phone: null });
    const res = await handleMissingCardPage(ID, fakeDb, ctx, "https://mishipass.example.com");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("WhatsApp Card");
    expect(html).toContain("Almaty");
    expect(html).toContain("100");
    expect(html).toContain(`https://mishipass.example.com/c/${ID}`);
    expect(html).not.toContain("private-key");
    expect(html).not.toContain("owner_id");
    expect(html).not.toContain("Medication Record");
  });

  it("does not produce a missing card for active cats", async () => {
    mockGetCatForOwner.mockResolvedValue({ public_id: ID, name: "Mishi", current_mode: "active", photo_r2_key: null });
    const res = await handleMissingCardPage(ID, fakeDb, ctx, "https://mishipass.example.com");
    expect(res.status).toBe(409);
  });

  it("includes public phone only when owner selected public phone", async () => {
    mockGetCatForOwner.mockResolvedValue({ public_id: ID, name: "Mishi", current_mode: "missing", photo_r2_key: null });
    mockGetMissingAlertForOwner.mockResolvedValue({ city: "Almaty", area: null, last_seen_at: null, reward_visible: 0, reward_amount: "100", recovery_board_opt_in: 0, activated_at: null });
    mockGetContactSettingsForOwner.mockResolvedValue({ contact_mode: "phone", public_phone: "+77000000000" });
    const html = await (await handleMissingCardPage(ID, fakeDb, ctx, "https://mishipass.example.com")).text();
    expect(html).toContain("+77000000000");
    expect(html).not.toContain("Reward:</strong> 100");
  });
});
