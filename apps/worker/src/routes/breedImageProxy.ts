const ALLOWED_HOSTNAME = "cdn2.thecatapi.com";
const MAX_BODY_SIZE = 5 * 1024 * 1024;
const MAX_URL_LENGTH = 2048;

function err400(msg: string): Response {
  return Response.json({ error: msg }, { status: 400 });
}

function err403(msg: string): Response {
  return Response.json({ error: msg }, { status: 403 });
}

function err502(msg: string): Response {
  return Response.json({ error: msg }, { status: 502 });
}

export async function handleBreedImageProxy(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) return err400("url is required");
  if (rawUrl.length > MAX_URL_LENGTH) return err400("url exceeds 2048 characters");
  if (/[\\#\s]/.test(rawUrl)) return err400("url contains disallowed characters");

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return err400("url is not a valid URL");
  }

  if (parsed.protocol !== "https:") return err403("url must use https");
  if (parsed.hostname.toLowerCase() !== ALLOWED_HOSTNAME) return err403("url hostname is not allowed");
  if (!parsed.pathname.startsWith("/images/")) return err403("url pathname must start with /images/");

  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) return cached;

  let upstream: Response;
  try {
    upstream = await fetch(rawUrl, {
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent": "MishiPass-Worker/1.0",
        "Accept": "image/*",
      },
    });
  } catch {
    return err502("upstream fetch failed or timed out");
  }

  if (!upstream.ok) return err502(`upstream returned ${upstream.status}`);

  const contentType = upstream.headers.get("Content-Type") ?? "";
  if (!contentType.startsWith("image/")) return err502("upstream returned non-image content-type");

  const contentLength = upstream.headers.get("Content-Length");
  if (contentLength !== null && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return err502("upstream response exceeds 5 MB");
  }

  if (!upstream.body) return err502("upstream returned empty body");

  const reader = upstream.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_SIZE) {
        await reader.cancel();
        return err502("upstream response exceeds 5 MB");
      }
      chunks.push(value);
    }
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const response = new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });

  await cache.put(request, response.clone());

  return response;
}
