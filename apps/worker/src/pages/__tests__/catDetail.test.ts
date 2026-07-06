import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleCatDetail } from "../catDetail.js";
import type { RequestContext } from "../../middleware/session.js";

const mockGetCatForOwner = vi.fn();

vi.mock("../../db/index.js", () => ({
  getCatForOwner: (...args: unknown[]) => mockGetCatForOwner(...args),
}));

const fakeDb = {} as D1Database;
const TEST_CAT_ID = "MP-MX-7X3B-9K21";
const PUBLIC_BASE_URL = "https://mishipass.example.com";
const authed: RequestContext = { ownerId: 1 };

function cat(overrides: Record<string, unknown> = {}) {
  return {
    public_id: TEST_CAT_ID,
    name: "Mishi",
    country_code: "MX",
    current_mode: "active",
    sex: null,
    color_markings: null,
    breed_mix: null,
    weight: null,
    birth_date: null,
    notes: null,
    photo_r2_key: null,
    ...overrides,
  };
}

beforeEach(() => {
  mockGetCatForOwner.mockReset();
});

describe("handleCatDetail", () => {
  it("does not render vet visit records (medical data lives in cartilla only)", async () => {
    mockGetCatForOwner.mockResolvedValue(cat());
    const res = await handleCatDetail(TEST_CAT_ID, fakeDb, authed, PUBLIC_BASE_URL);
    const html = await res.text();
    // Medical content must not appear on cat detail page
    expect(html).not.toContain("Vet Visit Records");
    expect(html).not.toContain("vet-entry");
    expect(html).not.toContain("No vet visits recorded yet.");
    // Links to cartilla should still be present
    expect(html).toContain(`/dashboard/cats/${TEST_CAT_ID}/cartilla`);
  });

  it("renders cat profile info fields when present", async () => {
    mockGetCatForOwner.mockResolvedValue(cat({
      sex: "female",
      color_markings: "Calico",
      breed_mix: "Persian",
      weight: "4.2 kg",
    }));
    const res = await handleCatDetail(TEST_CAT_ID, fakeDb, authed, PUBLIC_BASE_URL);
    const html = await res.text();
    expect(html).toContain("female");
    expect(html).toContain("Calico");
    expect(html).toContain("Persian");
    expect(html).toContain("4.2 kg");
  });

  it("renders navigation links including top nav", async () => {
    mockGetCatForOwner.mockResolvedValue(cat());
    const res = await handleCatDetail(TEST_CAT_ID, fakeDb, authed, PUBLIC_BASE_URL);
    const html = await res.text();
    expect(html).toContain("mp-top-nav");
    expect(html).toContain("/dashboard");
    expect(html).toContain(`/dashboard/cats/${TEST_CAT_ID}/public-profile`);
  });

  it("does not expose raw private fields on the owner detail page", async () => {
    mockGetCatForOwner.mockResolvedValue(cat({ photo_r2_key: `cats/${TEST_CAT_ID}/secret-key.jpg` }));
    const res = await handleCatDetail(TEST_CAT_ID, fakeDb, authed, PUBLIC_BASE_URL);
    const html = await res.text();
    expect(html).not.toContain("photo_r2_key");
    expect(html).not.toContain("secret-key");
    expect(html).not.toContain("owner_id");
    expect(html).not.toContain("cat_id");
  });
});
