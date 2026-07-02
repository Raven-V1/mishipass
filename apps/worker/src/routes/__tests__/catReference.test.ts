import { afterEach, describe, expect, it, vi } from "vitest";
import { handleCatReferenceBreeds } from "../catReference.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cat reference proxy", () => {
  it("returns fallback breeds when TheCatAPI fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const res = await handleCatReferenceBreeds(undefined);
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.source).toBe("fallback");
    expect(JSON.stringify(json)).not.toContain("THE_CAT_API_KEY");
  });

  it("maps TheCatAPI breed response without forcing jpg URLs or returning the API key", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([
      { id: "beng", name: "Bengal", reference_image_id: "O3btzLlsO" },
      { id: "siam", name: "Siamese", reference_image_id: "abc123" },
      { id: "mcoo", name: "Maine Coon", image: { url: "https://cdn2.thecatapi.com/images/OOD3VXAQn.jpg" } },
    ])));
    const res = await handleCatReferenceBreeds("secret-key");
    const json = await res.json() as { breeds: Array<Record<string, unknown>> };
    expect(json.breeds[0]).toEqual({
      id: "beng",
      name: "Bengal",
      referenceImageUrl: "https://cdn2.thecatapi.com/images/O3btzLlsO.png",
    });
    expect(json.breeds[1]).toMatchObject({ id: "siam", name: "Siamese", referenceImageUrl: null });
    expect(json.breeds[2]).toMatchObject({ id: "mcoo", name: "Maine Coon", referenceImageUrl: "https://cdn2.thecatapi.com/images/OOD3VXAQn.jpg" });
    expect(JSON.stringify(json)).not.toContain("secret-key");
    expect(JSON.stringify(json)).not.toContain("abc123.jpg");
  });
});
