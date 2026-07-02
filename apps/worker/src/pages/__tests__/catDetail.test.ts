import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleCatDetail } from "../catDetail.js";
import type { RequestContext } from "../../middleware/session.js";

const mockGetCatForOwner = vi.fn();
const mockListVetVisits = vi.fn();

vi.mock("../../db/index.js", () => ({
  getCatForOwner: (...args: unknown[]) => mockGetCatForOwner(...args),
  listVetVisits: (...args: unknown[]) => mockListVetVisits(...args),
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
  mockListVetVisits.mockReset();
});

describe("handleCatDetail", () => {
  it("renders a readable full Vet Visit record", async () => {
    mockGetCatForOwner.mockResolvedValue(cat());
    mockListVetVisits.mockResolvedValue([
      {
        id: 7,
        visit_date: "2026-07-02",
        vet_or_clinic_name: "Dr. Ada — North Clinic",
        notes: "Reason: Annual check\nWeight: 4.5 kg\nHealthy visit note",
        created_at: "2026-07-02T12:00:00Z",
      },
    ]);
    const res = await handleCatDetail(TEST_CAT_ID, fakeDb, authed, PUBLIC_BASE_URL);
    const html = await res.text();
    expect(html).toContain("Vet Visit Records");
    expect(html).toContain("2026-07-02");
    expect(html).toContain("Dr. Ada — North Clinic");
    expect(html).toContain("Annual check");
    expect(html).toContain("4.5 kg");
    expect(html).toContain("Healthy visit note");
    expect(html).toContain(`/dashboard/cats/${TEST_CAT_ID}/cartilla/vet-visits/7?lang=en`);
  });

  it("renders a non-empty fallback card for blank Vet Visit fields", async () => {
    mockGetCatForOwner.mockResolvedValue(cat());
    mockListVetVisits.mockResolvedValue([
      { id: 8, visit_date: null, vet_or_clinic_name: "", notes: "", created_at: "2026-07-02T12:00:00Z" },
    ]);
    const res = await handleCatDetail(TEST_CAT_ID, fakeDb, authed, PUBLIC_BASE_URL);
    const html = await res.text();
    expect(html).toContain("Date not recorded");
    expect(html).toContain("Vet visit record");
    expect(html).toContain(`/dashboard/cats/${TEST_CAT_ID}/cartilla/vet-visits/8?lang=en`);
    expect(html).not.toContain('<div class="vet-entry"></div>');
  });

  it("renders a clean empty state when no Vet Visit records exist", async () => {
    mockGetCatForOwner.mockResolvedValue(cat());
    mockListVetVisits.mockResolvedValue([]);
    const res = await handleCatDetail(TEST_CAT_ID, fakeDb, authed, PUBLIC_BASE_URL);
    const html = await res.text();
    expect(html).toContain("No vet visits recorded yet.");
    expect(html).not.toContain('<div class="vet-entry">');
  });

  it("does not expose raw private fields on the owner detail page", async () => {
    mockGetCatForOwner.mockResolvedValue(cat({ photo_r2_key: `cats/${TEST_CAT_ID}/secret-key.jpg` }));
    mockListVetVisits.mockResolvedValue([]);
    const res = await handleCatDetail(TEST_CAT_ID, fakeDb, authed, PUBLIC_BASE_URL);
    const html = await res.text();
    expect(html).not.toContain("photo_r2_key");
    expect(html).not.toContain("secret-key");
    expect(html).not.toContain("owner_id");
    expect(html).not.toContain("cat_id");
  });
});
