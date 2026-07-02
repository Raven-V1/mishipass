import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleRecoveryBoardOptIn, handleRecoveryBoardPage } from "../recoveryBoard.js";
import type { RequestContext } from "../../middleware/session.js";

const mockListRecoveryBoardAlerts = vi.fn();
const mockUpdateRecoveryBoardOptIn = vi.fn();

vi.mock("../../db/index.js", () => ({
  listRecoveryBoardAlerts: (...args: unknown[]) => mockListRecoveryBoardAlerts(...args),
  updateRecoveryBoardOptIn: (...args: unknown[]) => mockUpdateRecoveryBoardOptIn(...args),
}));

vi.mock("@mishipass/shared-validation", () => ({ validateId: () => true }));

const fakeDb = {} as D1Database;
const ID = "MP-MX-0000-0001";

beforeEach(() => {
  mockListRecoveryBoardAlerts.mockReset();
  mockUpdateRecoveryBoardOptIn.mockReset();
});

describe("Recovery Board", () => {
  it("renders only repository-returned opted-in missing alerts and no private data", async () => {
    mockListRecoveryBoardAlerts.mockResolvedValue([{ public_id: ID, name: "Mishi", country_code: "MX", photo_r2_key: "cats/private.jpg", city: "Almaty", area: "Bostandyk", last_seen_at: "2026-07-01", activated_at: "2026-07-01T00:00:00Z" }]);
    const res = await handleRecoveryBoardPage(new Request("https://example.com/recovery-board?city=Almaty&ageDays=7"), fakeDb);
    expect(res.status).toBe(200);
    expect(mockListRecoveryBoardAlerts).toHaveBeenCalledWith(fakeDb, "Almaty", 7);
    const html = await res.text();
    expect(html).toContain("Recovery Board");
    expect(html).toContain("Mishi");
    expect(html).toContain(`/c/${ID}`);
    expect(html).not.toContain("owner_id");
    expect(html).not.toContain("Medication Record");
    expect(html).not.toContain("cats/private.jpg");
  });

  it("owner opt-in route defaults off unless explicitly true", async () => {
    const ctx: RequestContext = { ownerId: 4 };
    mockUpdateRecoveryBoardOptIn.mockResolvedValue(true);
    const res = await handleRecoveryBoardOptIn(ID, new Request("https://example.com", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }), fakeDb, ctx);
    expect(res.status).toBe(200);
    expect(mockUpdateRecoveryBoardOptIn).toHaveBeenCalledWith(fakeDb, ID, 4, 0);
  });

  it("requires owner auth for opt-in changes", async () => {
    const ctx: RequestContext = { ownerId: null };
    const res = await handleRecoveryBoardOptIn(ID, new Request("https://example.com", { method: "POST", body: "{}" }), fakeDb, ctx);
    expect(res.status).toBe(401);
  });
});
