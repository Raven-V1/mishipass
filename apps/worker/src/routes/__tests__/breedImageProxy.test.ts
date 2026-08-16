import { afterEach, describe, expect, it, vi } from "vitest";
import { handleBreedImageProxy } from "../breedImageProxy.js";

const BASE = "https://worker.example.com/api/cat-reference/breeds/image";
const VALID_CDN = "https://cdn2.thecatapi.com/images/abc123.jpg";

function makeRequest(urlParam?: string): Request {
  const u = urlParam !== undefined
    ? `${BASE}?url=${encodeURIComponent(urlParam)}`
    : BASE;
  return new Request(u);
}

function fakeImageResponse(contentType = "image/jpeg", body = "IMGDATA"): Response {
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": contentType },
  });
}

function stubCaches(hit: Response | null = null) {
  const mockMatch = vi.fn().mockResolvedValue(hit);
  const mockPut = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("caches", { default: { match: mockMatch, put: mockPut } });
  return { mockMatch, mockPut };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("handleBreedImageProxy", () => {
  it("200 — returns image bytes and correct Content-Type on cache miss", async () => {
    stubCaches(null);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fakeImageResponse("image/jpeg")));
    const res = await handleBreedImageProxy(makeRequest(VALID_CDN));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    expect(res.headers.get("Cache-Control")).toMatch(/max-age=86400/);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("400 — missing url param", async () => {
    stubCaches(null);
    const res = await handleBreedImageProxy(makeRequest());
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/required/);
  });

  it("400 — malformed url", async () => {
    stubCaches(null);
    const res = await handleBreedImageProxy(makeRequest("not-a-url"));
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/valid URL/i);
  });

  it("403 — wrong hostname", async () => {
    stubCaches(null);
    const res = await handleBreedImageProxy(makeRequest("https://cdn.example.com/images/foo.jpg"));
    expect(res.status).toBe(403);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/hostname/);
  });

  it("403 — http protocol rejected", async () => {
    stubCaches(null);
    const res = await handleBreedImageProxy(makeRequest("http://cdn2.thecatapi.com/images/foo.jpg"));
    expect(res.status).toBe(403);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/https/);
  });

  it("403 — pathname does not start with /images/", async () => {
    stubCaches(null);
    const res = await handleBreedImageProxy(makeRequest("https://cdn2.thecatapi.com/other/foo.jpg"));
    expect(res.status).toBe(403);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/pathname/);
  });

  it("400 — url exceeds 2048 characters", async () => {
    stubCaches(null);
    const long = "https://cdn2.thecatapi.com/images/" + "a".repeat(2048);
    const res = await handleBreedImageProxy(makeRequest(long));
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/2048/);
  });

  it("502 — upstream returns non-image content-type", async () => {
    stubCaches(null);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("surprise", { status: 200, headers: { "Content-Type": "text/html" } }),
    ));
    const res = await handleBreedImageProxy(makeRequest(VALID_CDN));
    expect(res.status).toBe(502);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/content-type/i);
  });

  it("502 — upstream returns 5xx", async () => {
    stubCaches(null);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("bad gateway", { status: 502 }),
    ));
    const res = await handleBreedImageProxy(makeRequest(VALID_CDN));
    expect(res.status).toBe(502);
  });

  it("cache hit — returns cached response without re-fetching upstream", async () => {
    const cachedResponse = fakeImageResponse("image/png", "CACHED");
    const { mockMatch } = stubCaches(cachedResponse);
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const res = await handleBreedImageProxy(makeRequest(VALID_CDN));
    expect(res.status).toBe(200);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockMatch).toHaveBeenCalledTimes(1);
  });
});
