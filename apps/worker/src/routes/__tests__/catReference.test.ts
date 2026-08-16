import { afterEach, describe, expect, it, vi } from "vitest";
import { handleCatReferenceBreeds } from "../catReference.js";

const PROXY = (cdnUrl: string) =>
  `/api/cat-reference/breeds/image?url=${encodeURIComponent(cdnUrl)}`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cat reference proxy", () => {
  it("returns fallback breeds when TheCatAPI fails — URLs are proxy paths", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const res = await handleCatReferenceBreeds(undefined);
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.source).toBe("fallback");
    expect(json).toHaveProperty("featuredBreeds");
    expect(JSON.stringify(json)).not.toContain("THE_CAT_API_KEY");
    // No referenceImageUrl value should be a raw https:// URL — all must be proxy paths
    expect(JSON.stringify(json)).not.toContain('"referenceImageUrl":"https://');
    expect(JSON.stringify(json)).toContain("/api/cat-reference/breeds/image?url=");
  });

  it("maps TheCatAPI breed response — returns proxy paths, never CDN URLs, never exposes API key", async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([
      { id: "beng", name: "Bengal", reference_image_id: "O3btzLlsO" },
      { id: "siam", name: "Siamese", reference_image_id: "ai6Jps4sx" },
      { id: "mcoo", name: "Maine Coon", image: { url: "https://cdn2.thecatapi.com/images/OOD3VXAQn.jpg" } },
      { id: "ragd", name: "Ragdoll", reference_image_id: "xnzzM6MBI" },
      { id: "bad1", name: "NoImage", reference_image_id: "" },
    ])));
    const res = await handleCatReferenceBreeds("secret-key");
    const json = await res.json() as { breeds: Array<Record<string, unknown>>; featuredBreeds: Array<Record<string, unknown>> };
    // Bengal: known reference image URL → proxy path
    expect(json.breeds.find(breed => breed.name === "Bengal")).toMatchObject({
      id: "beng",
      name: "Bengal",
      referenceImageUrl: PROXY("https://cdn2.thecatapi.com/images/O3btzLlsO.png"),
      hasReferenceImage: true,
    });
    // Siamese: known reference image URL → proxy path
    expect(json.breeds.find(breed => breed.name === "Siamese")).toMatchObject({
      id: "siam",
      name: "Siamese",
      referenceImageUrl: PROXY("https://cdn2.thecatapi.com/images/ai6Jps4sx.jpg"),
      hasReferenceImage: true,
    });
    // Maine Coon: inline image.url → proxy path
    expect(json.breeds.find(breed => breed.name === "Maine Coon")).toMatchObject({
      id: "mcoo",
      name: "Maine Coon",
      referenceImageUrl: PROXY("https://cdn2.thecatapi.com/images/OOD3VXAQn.jpg"),
      hasReferenceImage: true,
    });
    // Ragdoll: CDN pattern fallback → proxy path
    expect(json.breeds.find(breed => breed.name === "Ragdoll")).toMatchObject({
      id: "ragd",
      name: "Ragdoll",
      referenceImageUrl: PROXY("https://cdn2.thecatapi.com/images/xnzzM6MBI.jpg"),
      hasReferenceImage: true,
    });
    // NoImage: null stays null
    expect(json.breeds.find(breed => breed.name === "NoImage")).toMatchObject({
      id: "bad1",
      name: "NoImage",
      referenceImageUrl: null,
      hasReferenceImage: false,
    });
    // Featured breeds use proxy path
    expect(json.featuredBreeds.some(breed =>
      breed.name === "Bengal" &&
      breed.referenceImageUrl === PROXY("https://cdn2.thecatapi.com/images/O3btzLlsO.png"),
    )).toBe(true);
    expect(json.featuredBreeds.some(breed => breed.name === "Devon Rex")).toBe(false);
    // No referenceImageUrl value should be a raw https:// URL — all must be proxy paths
    expect(JSON.stringify(json)).not.toContain('"referenceImageUrl":"https://');
    // No API key exposure
    expect(JSON.stringify(json)).not.toContain("secret-key");
    expect(JSON.stringify(json)).not.toContain("x-api-key");
  });
});
