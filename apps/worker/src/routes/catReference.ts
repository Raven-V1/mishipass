const FALLBACK_BREEDS = [
  { id: "mixed", name: "Mixed / Unknown", referenceImageUrl: null },
  { id: "abys", name: "Abyssinian", referenceImageUrl: "https://cdn2.thecatapi.com/images/0XYvRd7oD.jpg" },
  { id: "beng", name: "Bengal", referenceImageUrl: "https://cdn2.thecatapi.com/images/O3btzLlsO.png" },
  { id: "mcoo", name: "Maine Coon", referenceImageUrl: "https://cdn2.thecatapi.com/images/OOD3VXAQn.jpg" },
  { id: "pers", name: "Persian", referenceImageUrl: "https://cdn2.thecatapi.com/images/-Zfz5z2jK.jpg" },
  { id: "siam", name: "Siamese", referenceImageUrl: "https://cdn2.thecatapi.com/images/ai6Jps4sx.jpg" },
];

let cachedBreeds: unknown[] | null = null;
let cacheExpiresAt = 0;

function mapBreed(item: Record<string, unknown>) {
  const id = typeof item.id === "string" ? item.id : "";
  const name = typeof item.name === "string" ? item.name : "";
  const referenceImageId = typeof item.reference_image_id === "string" ? item.reference_image_id : null;
  if (!id || !name) return null;
  return {
    id,
    name,
    referenceImageUrl: referenceImageId ? `https://cdn2.thecatapi.com/images/${encodeURIComponent(referenceImageId)}.jpg` : null,
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
