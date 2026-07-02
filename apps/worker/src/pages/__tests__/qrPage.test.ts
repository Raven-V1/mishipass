/**
 * QR page regression tests.
 *
 * Ensures QR cards render an internal SVG QR code for the canonical public URL
 * without relying on external QR services.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleQrPage } from "../qrPage.js";
import type { RequestContext } from "../../middleware/session.js";

const mockGetCatForOwner = vi.fn();

vi.mock("../../db/index.js", () => ({
  getCatForOwner: (...args: unknown[]) => mockGetCatForOwner(...args),
}));

const fakeDb = {} as D1Database;
const TEST_CAT_ID = "MP-MX-7X3B-9K21";
const PUBLIC_BASE_URL = "https://mishipass.example.com";
const authed: RequestContext = { ownerId: 1 };
const unauthed: RequestContext = { ownerId: null };

beforeEach(() => {
  mockGetCatForOwner.mockReset();
});

describe("handleQrPage", () => {
  it("redirects unauthenticated owners before reading cat data", async () => {
    const res = await handleQrPage(TEST_CAT_ID, fakeDb, unauthed, PUBLIC_BASE_URL);
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/dashboard");
    expect(mockGetCatForOwner).not.toHaveBeenCalled();
  });

  it("returns 404 for invalid public IDs after the owner lookup misses", async () => {
    mockGetCatForOwner.mockResolvedValue(null);
    const res = await handleQrPage("bad-id", fakeDb, authed, PUBLIC_BASE_URL);
    expect(res.status).toBe(404);
    expect(mockGetCatForOwner).toHaveBeenCalledWith(fakeDb, "bad-id", 1);
  });

  it("returns 404 when the cat is not owned by the current owner", async () => {
    mockGetCatForOwner.mockResolvedValue(null);
    const res = await handleQrPage(TEST_CAT_ID, fakeDb, authed, PUBLIC_BASE_URL);
    expect(res.status).toBe(404);
  });

  it("renders an inline SVG QR for the canonical public cat URL", async () => {
    mockGetCatForOwner.mockResolvedValue({ public_id: TEST_CAT_ID, name: "Mishi" });
    const res = await handleQrPage(TEST_CAT_ID, fakeDb, authed, PUBLIC_BASE_URL);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");

    const html = await res.text();
    expect(html).toContain("<svg");
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="QR code"');
    expect(html).toContain(`${PUBLIC_BASE_URL}/c/${TEST_CAT_ID}`);
    expect(html).toContain("@media print");
    expect(html).not.toMatch(/external QR|QR generator|api\.qrserver|chart\.googleapis|cdn/i);
  });

  it("escapes cat names and does not expose internal IDs or backend fields", async () => {
    mockGetCatForOwner.mockResolvedValue({
      id: 123,
      owner_id: 456,
      public_id: TEST_CAT_ID,
      name: '<script>alert("xss")</script>',
      photo_r2_key: `cats/${TEST_CAT_ID}/secret-key.jpg`,
    });
    const res = await handleQrPage(TEST_CAT_ID, fakeDb, authed, PUBLIC_BASE_URL);
    const html = await res.text();
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("owner_id");
    expect(html).not.toContain("photo_r2_key");
    expect(html).not.toContain("secret-key");
    expect(html).not.toContain("123");
    expect(html).not.toContain("456");
  });
});
