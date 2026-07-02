import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleCreateMedication, handleCreateVaccine, handleVaccineStickerUpload } from "../cartilla.js";
import type { RequestContext } from "../../middleware/session.js";

const mockGetCatForOwner = vi.fn();
const mockGetVaccineForOwner = vi.fn();
const mockInsertMedication = vi.fn();
const mockInsertVaccine = vi.fn();
const mockUpdateVaccineStickerPhoto = vi.fn();

vi.mock("../../db/index.js", () => ({
  getCatForOwner: (...args: unknown[]) => mockGetCatForOwner(...args),
  getVaccineForOwner: (...args: unknown[]) => mockGetVaccineForOwner(...args),
  insertMedication: (...args: unknown[]) => mockInsertMedication(...args),
  insertVaccine: (...args: unknown[]) => mockInsertVaccine(...args),
  updateVaccineStickerPhoto: (...args: unknown[]) => mockUpdateVaccineStickerPhoto(...args),
}));

const fakeDb = {} as D1Database;
const authed: RequestContext = { ownerId: 3 };
const unauthed: RequestContext = { ownerId: null };
const TEST_ID = "MP-MX-0000-0001";

function jsonRequest(body: unknown): Request {
  return new Request("https://example.com/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function photoRequest(bytes: number[], type: string): Request {
  const fd = new FormData();
  fd.set("photo", new File([new Uint8Array(bytes)], "sticker", { type }));
  return new Request("https://example.com/test", { method: "POST", body: fd });
}

beforeEach(() => {
  mockGetCatForOwner.mockReset();
  mockGetVaccineForOwner.mockReset();
  mockInsertMedication.mockReset();
  mockInsertVaccine.mockReset();
  mockUpdateVaccineStickerPhoto.mockReset();
});

describe("cartilla routes", () => {
  it("owner-only create routes return 401 without auth", async () => {
    expect((await handleCreateVaccine(TEST_ID, jsonRequest({ vaccine_name: "FVRCP" }), fakeDb, unauthed)).status).toBe(401);
    expect((await handleCreateMedication(TEST_ID, jsonRequest({ medication_name: "Record" }), fakeDb, unauthed)).status).toBe(401);
  });

  it("creates vaccine records for owned cats", async () => {
    mockGetCatForOwner.mockResolvedValue({ public_id: TEST_ID });
    const res = await handleCreateVaccine(TEST_ID, jsonRequest({ vaccine_name: "FVRCP", date_given: "2026-07-01" }), fakeDb, authed);
    expect(res.status).toBe(201);
    expect(mockInsertVaccine).toHaveBeenCalledWith(fakeDb, TEST_ID, 3, { vaccine_name: "FVRCP", date_given: "2026-07-01" });
  });

  it("rejects advice-like medication fields", async () => {
    mockGetCatForOwner.mockResolvedValue({ public_id: TEST_ID });
    const res = await handleCreateMedication(TEST_ID, jsonRequest({ medication_name: "Amoxicillin", next_dose: "tomorrow" }), fakeDb, authed);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("Medication Record");
    expect(mockInsertMedication).not.toHaveBeenCalled();
  });

  it("uploads vaccine sticker photos only after ownership and content validation", async () => {
    mockGetVaccineForOwner.mockResolvedValue({ id: 5, sticker_photo_r2_key: null });
    const photos = { put: vi.fn().mockResolvedValue(undefined) } as unknown as R2Bucket & { put: ReturnType<typeof vi.fn> };
    const res = await handleVaccineStickerUpload(TEST_ID, "5", photoRequest([0x25, 0x50, 0x44, 0x46], "image/png"), fakeDb, photos, authed);
    expect(res.status).toBe(400);
    expect(photos.put).not.toHaveBeenCalled();
    expect(mockUpdateVaccineStickerPhoto).not.toHaveBeenCalled();
  });
});
