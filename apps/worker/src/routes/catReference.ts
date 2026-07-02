const FALLBACK_BREEDS = [
  { id: "mixed", name: "Mixed / Unknown", referenceImageUrl: null },
  { id: "abys", name: "Abyssinian", referenceImageUrl: "https://cdn2.thecatapi.com/images/0XYvRd7oD.jpg" },
  { id: "beng", name: "Bengal", referenceImageUrl: "https://cdn2.thecatapi.com/images/O3btzLlsO.png" },
  { id: "mcoo", name: "Maine Coon", referenceImageUrl: "https://cdn2.thecatapi.com/images/OOD3VXAQn.jpg" },
  { id: "pers", name: "Persian", referenceImageUrl: "https://cdn2.thecatapi.com/images/-Zfz5z2jK.jpg" },
  { id: "siam", name: "Siamese", referenceImageUrl: "https://cdn2.thecatapi.com/images/ai6Jps4sx.jpg" },
];

const KNOWN_REFERENCE_IMAGE_URLS: Record<string, string> = Object.fromEntries(
  FALLBACK_BREEDS
    .filter((breed): breed is { id: string; name: string; referenceImageUrl: string } => breed.referenceImageUrl !== null)
    .map(breed => {
      const id = breed.referenceImageUrl.split("/").pop()?.replace(/\.[^.]+$/, "") || "";
      return [id, breed.referenceImageUrl];
    }),
);

let cachedBreeds: unknown[] | null = null;
let cacheExpiresAt = 0;

function safeTheCatApiImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (url.hostname !== "cdn2.thecatapi.com") return null;
    if (!/^\/images\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(url.pathname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function mapBreed(item: Record<string, unknown>) {
  const id = typeof item.id === "string" ? item.id : "";
  const name = typeof item.name === "string" ? item.name : "";
  const referenceImageId = typeof item.reference_image_id === "string" ? item.reference_image_id : null;
  const image = typeof item.image === "object" && item.image !== null ? item.image as Record<string, unknown> : null;
  const directImageUrl = safeTheCatApiImageUrl(image?.url);
  if (!id || !name) return null;
  return {
    id,
    name,
    referenceImageUrl: directImageUrl || (referenceImageId ? KNOWN_REFERENCE_IMAGE_URLS[referenceImageId] || null : null),
  };
}

export async function handleCatReferenceBreeds(apiKey?: string): Promise<Response> {
  const now = Date.now();
  if (cachedBreeds && now < cacheExpiresAt) {
    return Response.json({ source: "cache", breeds: cachedBreeds }, { status: 200 });
  }

  try {
    const init = apiKey ? { headers: { "x-api-key": apiKey } } : undefined;
    const response = await fetch("https://api.thecatapi.com/v1/breeds", init);
    if (!response.ok) throw new Error("TheCatAPI unavailable");
    const raw = await response.json();
    if (!Array.isArray(raw)) throw new Error("Unexpected TheCatAPI response");
    const breeds = raw
      .map(item => typeof item === "object" && item !== null ? mapBreed(item as Record<string, unknown>) : null)
      .filter((item): item is { id: string; name: string; referenceImageUrl: string | null } => item !== null);
    cachedBreeds = breeds.length > 0 ? breeds : FALLBACK_BREEDS;
    cacheExpiresAt = now + 6 * 60 * 60 * 1000;
    return Response.json({ source: "thecatapi", breeds: cachedBreeds }, { status: 200 });
  } catch {
    return Response.json({ source: "fallback", breeds: FALLBACK_BREEDS }, { status: 200 });
  }
}
