/**
 * Photo route regression tests.
 *
 * Covers owner isolation, R2 key privacy, MIME allow-listing, magic-byte
 * validation, and private sighting photo serving.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkMagicBytes,
  handleCatPhotoServe,
  handleCatPhotoUpload,
  handleSightingPhotoServe,
} from "../photos.js";
import type { RequestContext } from "../../middleware/session.js";

const mockGetCatForOwner = vi.fn();
const mockGetCatPublicProfile = vi.fn();
const mockListSightingReportsForOwner = vi.fn();
const mockUpdateCatPhoto = vi.fn();

vi.mock("../../db/index.js", () => ({
  getCatForOwner: (...args: unknown[]) => mockGetCatForOwner(...args),
  getCatPublicProfile: (...args: unknown[]) => mockGetCatPublicProfile(...args),
  listSightingReportsForOwner: (...args: unknown[]) => mockListSightingReportsForOwner(...args),
  updateCatPhoto: (...args: unknown[]) => mockUpdateCatPhoto(...args),
}));

const mockValidateId = vi.fn();

vi.mock("@mishipass/shared-validation", () => ({
  validateId: (...args: unknown[]) => mockValidateId(...args),
}));

const TEST_CAT_ID = "MP-MX-7X3B-9K21";
const authed: RequestContext = { ownerId: 1 };
const unauthed: RequestContext = { ownerId: null };
const fakeDb = {} as D1Database;

function makePhotosBucket() {
  return {
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
  } as unknown as R2Bucket & { put: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
}

function uploadRequest(bytes: number[], type: string): Request {
  const formData = new FormData();
  formData.set("photo", new File([new Uint8Array(bytes)], "cat-photo", { type }));
  return new Request(`https://example.com/api/cats/${TEST_CAT_ID}/photo`, {
    method: "POST",
    body: formData,
  });
}

function r2Object(bodyText: string, contentType: string) {
  return {
    body: new Response(bodyText).body,
    httpMetadata: { contentType },
  } as unknown as R2ObjectBody;
}

beforeEach(() => {
  mockGetCatForOwner.mockReset();
  mockGetCatPublicProfile.mockReset();
  mockListSightingReportsForOwner.mockReset();
  mockUpdateCatPhoto.mockReset();
  mockValidateId.mockReset();
  mockValidateId.mockReturnValue(true);
});

describe("checkMagicBytes", () => {
  it("accepts JPEG, PNG, and WebP signatures only when they match the MIME type", () => {
    expect(checkMagicBytes(new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]), "image/jpeg")).toBe(true);
    expect(checkMagicBytes(new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), "image/png")).toBe(true);
    expect(checkMagicBytes(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]), "image/webp")).toBe(true);
    expect(checkMagicBytes(new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]), "image/png")).toBe(false);
    expect(checkMagicBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46]), "image/jpeg")).toBe(false);
  });
});

describe("handleCatPhotoUpload", () => {
  it("returns 401 without owner auth and never touches R2", async () => {
    const photos = makePhotosBucket();
    const res = await handleCatPhotoUpload(TEST_CAT_ID, uploadRequest([0xFF, 0xD8, 0xFF, 0xE0], "image/jpeg"), fakeDb, photos, unauthed);
    expect(res.status).toBe(401);
    expect(photos.put).not.toHaveBeenCalled();
    expect(mockUpdateCatPhoto).not.toHaveBeenCalled();
  });

  it("returns 404 for non-owner cats and never touches R2", async () => {
    const photos = makePhotosBucket();
    mockGetCatForOwner.mockResolvedValue(null);
    const res = await handleCatPhotoUpload(TEST_CAT_ID, uploadRequest([0xFF, 0xD8, 0xFF, 0xE0], "image/jpeg"), fakeDb, photos, authed);
    expect(res.status).toBe(404);
    expect(photos.put).not.toHaveBeenCalled();
    expect(mockUpdateCatPhoto).not.toHaveBeenCalled();
  });

  it("rejects arbitrary MIME types", async () => {
    const photos = makePhotosBucket();
    mockGetCatForOwner.mockResolvedValue({ public_id: TEST_CAT_ID });
    const res = await handleCatPhotoUpload(TEST_CAT_ID, uploadRequest([0x25, 0x50, 0x44, 0x46], "application/pdf"), fakeDb, photos, authed);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid file type. Allowed: JPEG, PNG, WebP" });
    expect(photos.put).not.toHaveBeenCalled();
  });

  it("rejects image uploads whose magic bytes do not match the declared type", async () => {
    const photos = makePhotosBucket();
    mockGetCatForOwner.mockResolvedValue({ public_id: TEST_CAT_ID });
    const res = await handleCatPhotoUpload(TEST_CAT_ID, uploadRequest([0x25, 0x50, 0x44, 0x46], "image/png"), fakeDb, photos, authed);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "File content does not match declared type" });
    expect(photos.put).not.toHaveBeenCalled();
  });

  it("stores only a generated R2 object key and never returns that key to the client", async () => {
    const photos = makePhotosBucket();
    mockGetCatForOwner.mockResolvedValue({ public_id: TEST_CAT_ID });
    const res = await handleCatPhotoUpload(TEST_CAT_ID, uploadRequest([0xFF, 0xD8, 0xFF, 0xE0], "image/jpeg"), fakeDb, photos, authed);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(photos.put).toHaveBeenCalledOnce();
    const objectKey = photos.put.mock.calls[0]![0] as string;
    expect(objectKey).toMatch(new RegExp(`^cats/${TEST_CAT_ID}/[a-f0-9]{32}\\.jpg$`));
    expect(mockUpdateCatPhoto).toHaveBeenCalledWith(fakeDb, TEST_CAT_ID, 1, objectKey);
  });
});

describe("handleCatPhotoServe", () => {
  it("serves public cat photos through the Worker route without exposing the raw R2 key", async () => {
    const photos = makePhotosBucket();
    const rawKey = `cats/${TEST_CAT_ID}/secret-key.jpg`;
    mockGetCatPublicProfile.mockResolvedValue({ public_id: TEST_CAT_ID, photo_r2_key: rawKey });
    photos.get.mockResolvedValue(r2Object("jpeg-bytes", "image/jpeg"));

    const res = await handleCatPhotoServe(TEST_CAT_ID, fakeDb, photos);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(photos.get).toHaveBeenCalledWith(rawKey);
    expect(await res.text()).toBe("jpeg-bytes");
  });

  it("returns 404 for invalid IDs and missing photo records", async () => {
    const photos = makePhotosBucket();
    mockValidateId.mockReturnValueOnce(false);
    expect((await handleCatPhotoServe("bad-id", fakeDb, photos)).status).toBe(404);
    expect(mockGetCatPublicProfile).not.toHaveBeenCalled();

    mockValidateId.mockReturnValue(true);
    mockGetCatPublicProfile.mockResolvedValue({ public_id: TEST_CAT_ID, photo_r2_key: null });
    expect((await handleCatPhotoServe(TEST_CAT_ID, fakeDb, photos)).status).toBe(404);
    expect(photos.get).not.toHaveBeenCalled();
  });
});

describe("handleSightingPhotoServe", () => {
  it("returns 401 without owner auth and never touches R2", async () => {
    const photos = makePhotosBucket();
    const res = await handleSightingPhotoServe(TEST_CAT_ID, "2026-06-30T00:00:00Z", fakeDb, photos, unauthed);
    expect(res.status).toBe(401);
    expect(photos.get).not.toHaveBeenCalled();
  });

  it("serves only matching owner-scoped sighting photos with private cache headers", async () => {
    const photos = makePhotosBucket();
    mockListSightingReportsForOwner.mockResolvedValue([
      {
        created_at: "2026-06-30T00:00:00Z",
        photo_r2_key: `sightings/${TEST_CAT_ID}/private-key.webp`,
        location_text: "CDMX",
        message: "Seen near park",
      },
    ]);
    photos.get.mockResolvedValue(r2Object("webp-bytes", "image/webp"));

    const res = await handleSightingPhotoServe(TEST_CAT_ID, "2026-06-30T00:00:00Z", fakeDb, photos, authed);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/webp");
    expect(res.headers.get("Cache-Control")).toContain("private");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(await res.text()).toBe("webp-bytes");
  });

  it("returns 404 when no owner-scoped sighting photo matches", async () => {
    const photos = makePhotosBucket();
    mockListSightingReportsForOwner.mockResolvedValue([]);
    const res = await handleSightingPhotoServe(TEST_CAT_ID, "2026-06-30T00:00:00Z", fakeDb, photos, authed);
    expect(res.status).toBe(404);
    expect(photos.get).not.toHaveBeenCalled();
  });
});
