import { describe, expect, it, vi, beforeEach } from "vitest";
import { handlePublicProfileSettingsPage } from "../publicProfileSettings.js";

vi.mock("../../db/index.js", () => ({
  getCatForOwner: vi.fn(),
  getContactSettingsForOwner: vi.fn(),
}));

const { getCatForOwner, getContactSettingsForOwner } = await import("../../db/index.js");

describe("handlePublicProfileSettingsPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders the public profile and QR settings page for an authenticated owner", async () => {
    vi.mocked(getCatForOwner).mockResolvedValue({
      public_id: "MP-US-TEST-0001",
      name: "Mishi",
      country_code: "US",
      photo_r2_key: null,
      current_mode: "active",
      sex: "Female",
      birth_date: "2024-01-01",
      next_vaccine_date: null,
      color_markings: "Calico",
      breed_mix: "Mixed / Unknown / Other",
      weight: null,
      notes: null,
      microchip_number: null,
      microchip_date: null,
    });
    vi.mocked(getContactSettingsForOwner).mockResolvedValue({
      contact_mode: "relay",
      public_phone: null,
    });

    const response = await handlePublicProfileSettingsPage(
      "MP-US-TEST-0001",
      {} as D1Database,
      { ownerId: 1 } as { ownerId: number },
      "https://example.com",
      "en",
    );
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("Public Profile");
    expect(html).toContain("QR Code");
    expect(html).toContain("MP-US-TEST-0001");
    expect(html).toContain("Mishi");
  });
});
