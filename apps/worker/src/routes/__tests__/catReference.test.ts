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
    expect(json).toHaveProperty("featuredBreeds");
    expect(JSON.stringify(json)).not.toContain("THE_CAT_API_KEY");
  });

  it("maps TheCatAPI breed response without forcing jpg URLs or returning the API key", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([
      { id: "beng", name: "Bengal", reference_image_id: "O3btzLlsO" },
      { id: "siam", name: "Siamese", reference_image_id: "abc123" },
      { id: "mcoo", name: "Maine Coon", image: { url: "https://cdn2.thecatapi.com/images/OOD3VXAQn.jpg" } },
    ])));
    const res = await handleCatReferenceBreeds("secret-key");
    const json = await res.json() as { breeds: Array<Record<string, unknown>>; featuredBreeds: Array<Record<string, unknown>> };
    expect(json.breeds.find(breed => breed.name === "Bengal")).toMatchObject({
      id: "beng",
      name: "Bengal",
      referenceImageUrl: "https://cdn2.thecatapi.com/images/O3btzLlsO.png",
      hasReferenceImage: true,
    });
    expect(json.breeds.find(breed => breed.name === "Siamese")).toMatchObject({ id: "siam", name: "Siamese", referenceImageUrl: null, hasReferenceImage: false });
    expect(json.breeds.find(breed => breed.name === "Maine Coon")).toMatchObject({ id: "mcoo", name: "Maine Coon", referenceImageUrl: "https://cdn2.thecatapi.com/images/OOD3VXAQn.jpg", hasReferenceImage: true });
    expect(json.featuredBreeds.some(breed => breed.name === "Bengal" && breed.referenceImageUrl === "https://cdn2.thecatapi.com/images/O3btzLlsO.png")).toBe(true);
    expect(json.featuredBreeds.some(breed => breed.name === "Devon Rex")).toBe(false);
    expect(JSON.stringify(json)).not.toContain("secret-key");
    expect(JSON.stringify(json)).not.toContain("abc123.jpg");
  });
});
