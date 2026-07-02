import { validateId } from "@mishipass/shared-validation";
import {
  getCatPublicProfile,
  insertSightingReport,
  listSightingReportsForOwner,
} from "../db/index.js";
import type { RequestContext } from "../middleware/session.js";
import { checkRateLimit } from "../middleware/rateLimit.js";
import { checkDurableRateLimit } from "../middleware/durableRateLimit.js";
import { hmacSha256Hex } from "../utils/crypto.js";
import { checkMagicBytes } from "./photos.js";
import { type LanguageCode, getLanguageFromRequest, t } from "../utils/i18n.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── GET /c/:publicId/sighting ───────────────────────────────────────────────

export async function handleSightingForm(
  publicId: string,
  db: D1Database,
  lang: LanguageCode = "en",
): Promise<Response> {
  if (!validateId(publicId)) {
    return new Response("Not Found", { status: 404 });
  }

  const cat = await getCatPublicProfile(db, publicId);
  if (!cat) {
    return new Response("Not Found", { status: 404 });
  }

  if (cat.current_mode !== "missing") {
    return new Response(
      renderNotAcceptingPage(lang),
      {
        status: 200,
        headers: {
          "Content-Type": "text/html;charset=UTF-8",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }

  return new Response(
    renderSightingForm(publicId, cat.name, lang),
    {
      status: 200,
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

// ── POST /c/:publicId/sighting ──────────────────────────────────────────────

export async function handleSightingSubmit(
  publicId: string,
  request: Request,
  db: D1Database,
  photos: R2Bucket,
  hmacSecret?: string,
): Promise<Response> {
  const lang = getLanguageFromRequest(request);
  if (!validateId(publicId)) {
    return new Response("Not Found", { status: 404 });
  }

  const cat = await getCatPublicProfile(db, publicId);
  if (!cat) {
    return new Response("Not Found", { status: 404 });
  }

  if (cat.current_mode !== "missing") {
    return Response.json({ error: "Not accepting reports" }, { status: 400 });
  }

  // Rate limiting: 5 submissions per 10 minutes per IP+publicId
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const secret = hmacSecret || "";
  if (!secret) {
    return Response.json({ error: "Service configuration error" }, { status: 503 });
  }
  const hashedIp = await hmacSha256Hex(ip, secret);
  const rateLimitKey = `sighting:${hashedIp.slice(0, 16)}:${publicId}`;

  // Use durable D1-backed rate limiter (survives isolate restarts)
  const durableAllowed = await checkDurableRateLimit(db, rateLimitKey, 5, 10);
  if (!durableAllowed) {
    return Response.json(
      { error: "Too many reports. Try again later." },
      { status: 429 },
    );
  }

  // Also check in-memory limiter as fast first-line defense
  if (!checkRateLimit(rateLimitKey, 5, 10 * 60 * 1000)) {
    return Response.json(
      { error: "Too many reports. Try again later." },
      { status: 429 },
    );
  }

  // Parse body (form-urlencoded, JSON, or multipart/form-data)
  let city = "";
  let area = "";
  let sightedAt = "";
  let message = "";
  let reporterName = "";
  let reporterContact = "";
  let sightingPhoto: File | null = null;

  const contentType = request.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }
    if (typeof body === "object" && body !== null) {
      const b = body as Record<string, unknown>;
      city = typeof b["city"] === "string" ? b["city"] : "";
      area = typeof b["area"] === "string" ? b["area"] : "";
      sightedAt = typeof b["sightedAt"] === "string" ? b["sightedAt"] : "";
      message = typeof b["message"] === "string" ? b["message"] : "";
      reporterName = typeof b["reporterName"] === "string" ? b["reporterName"] : "";
      reporterContact = typeof b["reporterContact"] === "string" ? b["reporterContact"] : "";
    }
  } else if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json({ error: "Invalid form data" }, { status: 400 });
    }
    city = (formData.get("city") as string) || "";
    area = (formData.get("area") as string) || "";
    sightedAt = (formData.get("sightedAt") as string) || "";
    message = (formData.get("message") as string) || "";
    reporterName = (formData.get("reporterName") as string) || "";
    reporterContact = (formData.get("reporterContact") as string) || "";

    // Optional photo
    const photoField = formData.get("photo");
    if (photoField && typeof photoField !== "string") {
      sightingPhoto = photoField as File;
    }
  } else {
    // Default: application/x-www-form-urlencoded
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json({ error: "Invalid form data" }, { status: 400 });
    }
    city = (formData.get("city") as string) || "";
    area = (formData.get("area") as string) || "";
    sightedAt = (formData.get("sightedAt") as string) || "";
    message = (formData.get("message") as string) || "";
    reporterName = (formData.get("reporterName") as string) || "";
    reporterContact = (formData.get("reporterContact") as string) || "";
  }

  // Validation
  city = city.trim();
  area = area.trim();
  sightedAt = sightedAt.trim();
  message = message.trim();
  reporterName = reporterName.trim();
  reporterContact = reporterContact.trim();

  if (city.length < 1 || city.length > 80) {
    return Response.json({ error: "City is required (max 80 characters)" }, { status: 400 });
  }
  if (area.length > 120) {
    return Response.json({ error: "Area must be 120 characters or fewer" }, { status: 400 });
  }
  if (sightedAt.length > 80) {
    return Response.json({ error: "Sighted-at must be 80 characters or fewer" }, { status: 400 });
  }
  if (message.length > 1000) {
    return Response.json({ error: "Message must be 1000 characters or fewer" }, { status: 400 });
  }
  if (reporterName.length > 80) {
    return Response.json({ error: "Reporter name must be 80 characters or fewer" }, { status: 400 });
  }
  if (reporterContact.length > 120) {
    return Response.json({ error: "Reporter contact must be 120 characters or fewer" }, { status: 400 });
  }

  // Build location_text
  const locationText = city + (area ? ", " + area : "");

  // Build combined message
  const parts: string[] = [];
  if (sightedAt) parts.push("Sighted at: " + sightedAt);
  if (message) parts.push(message);
  if (reporterName) parts.push("Reporter: " + reporterName);
  if (reporterContact) parts.push("Contact: " + reporterContact);
  const combinedMessage = parts.join("\n") || null;

  // Hash IP using HMAC-SHA256 (secret presence already verified above)
  const reporterIpHash = await hmacSha256Hex(ip, secret);

  // Process photo if present
  let photoR2Key: string | null = null;
  if (sightingPhoto) {
    const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
    const MAX_SIZE = 3 * 1024 * 1024; // 3 MB

    if (!ALLOWED.has(sightingPhoto.type)) {
      return Response.json({ error: "Invalid photo type. Allowed: JPEG, PNG, WebP" }, { status: 400 });
    }
    if (sightingPhoto.size > MAX_SIZE) {
      return Response.json({ error: "Photo too large. Maximum 3 MB" }, { status: 400 });
    }
    if (sightingPhoto.size === 0) {
      return Response.json({ error: "Photo file is empty" }, { status: 400 });
    }

    // Magic byte validation
    const photoBuffer = await sightingPhoto.arrayBuffer();
    const headerView = new Uint8Array(photoBuffer, 0, Math.min(12, photoBuffer.byteLength));
    if (!checkMagicBytes(headerView, sightingPhoto.type)) {
      return Response.json({ error: "Photo content does not match declared type" }, { status: 400 });
    }

    // Upload to R2
    const ext = sightingPhoto.type === "image/jpeg" ? "jpg" : sightingPhoto.type === "image/png" ? "png" : "webp";
    const rnd = crypto.getRandomValues(new Uint8Array(16));
    const hex = Array.from(rnd).map(b => b.toString(16).padStart(2, "0")).join("");
    photoR2Key = `sightings/${publicId}/${hex}.${ext}`;

    await photos.put(photoR2Key, photoBuffer, {
      httpMetadata: { contentType: sightingPhoto.type },
    });
  }

  await insertSightingReport(db, {
    catPublicId: publicId,
    message: combinedMessage,
    location_text: locationText,
    reporter_ip_hash: reporterIpHash,
    photo_r2_key: photoR2Key,
  });

  return new Response(
    renderSuccessPage(publicId, lang),
    {
      status: 200,
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

// ── GET /api/cats/:publicId/sightings ───────────────────────────────────────

export async function handleListSightingsForOwner(
  publicId: string,
  db: D1Database,
  ctx: RequestContext,
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response("Unauthorized", { status: 401 });
  }

  const reports = await listSightingReportsForOwner(db, publicId, ctx.ownerId);
  const safeReports = reports.map((r) => ({
    message: r.message,
    location_text: r.location_text,
    created_at: r.created_at,
  }));

  return Response.json(safeReports, { status: 200 });
}

// ── HTML renderers ──────────────────────────────────────────────────────────

function renderNotAcceptingPage(lang: LanguageCode): string {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t(lang, "reportSighting")} — MishiPass</title>
  <style>body{font-family:sans-serif;max-width:480px;margin:2rem auto;padding:0 1rem}</style>
</head>
<body>
  <p>${t(lang, "sightingClosed")}</p>
</body>
</html>`;
}

function renderSightingForm(publicId: string, catName: string, lang: LanguageCode): string {
  const safeName = escapeHtml(catName);
  const safeId = escapeHtml(publicId);
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t(lang, "reportSighting")} — ${safeName} — MishiPass</title>
  <style>
    body{font-family:sans-serif;max-width:480px;margin:2rem auto;padding:0 1rem;line-height:1.5}
    h1{font-size:1.5rem;margin-bottom:1rem}
    label{display:block;margin-bottom:0.25rem;font-size:0.875rem;font-weight:500}
    input,textarea{width:100%;padding:0.5rem;border:1px solid #ccc;border-radius:4px;margin-bottom:0.75rem;font-size:1rem;box-sizing:border-box}
    textarea{resize:vertical;min-height:80px}
    button{padding:0.75rem 1.5rem;background:#111;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:1rem}
  </style>
</head>
<body>
  <h1>${t(lang, "reportSightingOf")} ${safeName}</h1>
  <form method="POST" action="/c/${safeId}/sighting?lang=${lang}" enctype="multipart/form-data">
    <label for="city">${t(lang, "city")} (required)</label>
    <input type="text" id="city" name="city" required maxlength="80" />
    <label for="area">${t(lang, "area")}</label>
    <input type="text" id="area" name="area" maxlength="120" />
    <label for="sightedAt">When was the cat sighted?</label>
    <input type="text" id="sightedAt" name="sightedAt" maxlength="80" />
    <label for="message">${t(lang, "additionalDetails")}</label>
    <textarea id="message" name="message" maxlength="1000"></textarea>
    <label for="reporterName">Your name (optional)</label>
    <input type="text" id="reporterName" name="reporterName" maxlength="80" />
    <label for="reporterContact">Your contact info (optional)</label>
    <input type="text" id="reporterContact" name="reporterContact" maxlength="120" />
    <label for="photo">${t(lang, "photo")} (optional, max 3 MB)</label>
    <input type="file" id="photo" name="photo" accept="image/jpeg,image/png,image/webp" />
    <button type="submit">${t(lang, "submitSighting")}</button>
  </form>
</body>
</html>`;
}

function renderSuccessPage(publicId: string, lang: LanguageCode): string {
  const safeId = escapeHtml(publicId);
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t(lang, "sightingSubmitted")} — MishiPass</title>
  <style>body{font-family:sans-serif;max-width:480px;margin:2rem auto;padding:0 1rem}</style>
</head>
<body>
  <p>${t(lang, "sightingSubmitted")}</p>
  <p><a href="/c/${safeId}?lang=${lang}">${t(lang, "backToProfile")}</a></p>
</body>
</html>`;
}
