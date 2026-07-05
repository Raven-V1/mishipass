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
import { MISHIPASS_DESIGN_CSS, brandLockupHtml } from "../utils/html.js";

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
  let healthCondition = "";
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
      healthCondition = typeof b["healthCondition"] === "string" ? b["healthCondition"] : "";
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
    healthCondition = (formData.get("healthCondition") as string) || "";

    // Optional photo
    const photoField = formData.get("photo") || formData.get("photoCapture") || formData.get("photoUpload");
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
    healthCondition = (formData.get("healthCondition") as string) || "";
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
  if (healthCondition) parts.push("Health condition: " + healthCondition);
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
  <style>${MISHIPASS_DESIGN_CSS}body{padding:var(--space-3)}.message-shell{max-width:560px;margin:var(--space-6) auto}.message-card{padding:var(--space-4);margin-top:var(--space-3)}@media(max-width:430px){body{padding:var(--space-2)}.message-card{padding:var(--space-3)}}</style>
</head>
<body>
  <main class="message-shell">${brandLockupHtml(`/?lang=${lang}`)}<section class="mp-card message-card"><p>${t(lang, "sightingClosed")}</p></section></main>
</body>
</html>`;
}

function renderSightingForm(publicId: string, catName: string, lang: LanguageCode): string {
  const safeName = escapeHtml(catName);
  const safeId = escapeHtml(publicId);
  const healthOptions = [
    ["", "—"],
    ["looks_ok", lang === "es" ? "Parece bien" : lang === "kk-KZ" ? "Жақсы көрінеді" : "Looks okay"],
    ["injured", lang === "es" ? "Lesionado/a" : lang === "kk-KZ" ? "Жарақаттанған" : "Appears injured"],
    ["thin", lang === "es" ? "Delgado/a" : lang === "kk-KZ" ? "Арық" : "Appears thin / hungry"],
    ["scared", lang === "es" ? "Asustado/a" : lang === "kk-KZ" ? "Қорыққан" : "Scared / hiding"],
    ["other", lang === "es" ? "Otro" : lang === "kk-KZ" ? "Басқа" : "Other"],
  ].map(([v, l]) => `<option value="${v}">${l}</option>`).join("");

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t(lang, "reportSighting")} — ${safeName} — MishiPass</title>
  <style>
    ${MISHIPASS_DESIGN_CSS}
    body{padding:var(--space-3)}
    .page-shell{max-width:768px;margin:var(--space-4) auto}.form-shell{padding:var(--space-4);margin-top:var(--space-3)}
    .sighting-head{display:flex;align-items:center;gap:var(--space-2);margin:0 0 var(--space-3)}
    .sighting-head h1{font-size:clamp(1.75rem,5vw,2.5rem);line-height:1.08;margin:0;color:var(--teal)}
    .sighting-sub{color:var(--muted);font-weight:700;margin:0 0 var(--space-3);font-size:.9375rem}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2) var(--space-3)}
    .field{display:grid;gap:var(--space-1);margin-bottom:0}
    .field-wide{grid-column:1/-1}
    .field label{font-size:.875rem;font-weight:900;color:var(--teal)}
    .required-mark{color:var(--brand-coral);font-size:.75rem;margin-left:2px}
    .photo-picker{margin:0}.photo-picker-actions{display:flex;gap:var(--space-1);flex-wrap:wrap}.photo-action{flex:1 1 160px}.photo-input-visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}.photo-status{margin-top:var(--space-1);overflow-wrap:anywhere;font-size:.875rem;color:var(--muted)}
    .submit-row{display:flex;gap:var(--space-2);flex-wrap:wrap;margin-top:var(--space-3)}.submit-row>*{flex:1 1 180px}
    @media(max-width:600px){.form-grid{grid-template-columns:1fr}.field-wide{grid-column:1}}
    @media(max-width:430px){body{padding:var(--space-2)}.form-shell{padding:var(--space-3)}.photo-action,.submit-row>*{width:100%;flex-basis:100%}}
  </style>
</head>
<body>
  <main class="page-shell">
  ${brandLockupHtml(`/?lang=${lang}`)}
  <section class="mp-card form-shell">
    <div class="sighting-head">
      <h1>${t(lang, "reportSighting")}</h1>
    </div>
    <p class="sighting-sub">${t(lang, "reportSightingOf")} <strong>${safeName}</strong></p>
    <form method="POST" action="/c/${safeId}/sighting?lang=${lang}" enctype="multipart/form-data">
      <div class="form-grid">
        <div class="field field-wide">
          <label for="city">${t(lang, "locationText")}<span class="required-mark">${t(lang, "sightingRequired")}</span></label>
          <input type="text" id="city" name="city" required maxlength="80" placeholder="${t(lang, "city")}" />
        </div>
        <div class="field">
          <label for="area">${t(lang, "area")} (${t(lang, "optional")})</label>
          <input type="text" id="area" name="area" maxlength="120" />
        </div>
        <div class="field">
          <label for="sightedAt">${t(lang, "dateLabel")} / ${t(lang, "timeLabel")} (${t(lang, "optional")})</label>
          <input type="datetime-local" id="sightedAt" name="sightedAt" maxlength="80" />
        </div>
        <div class="field">
          <label for="healthCondition">${t(lang, "healthCondition")} (${t(lang, "optional")})</label>
          <select id="healthCondition" name="healthCondition">${healthOptions}</select>
        </div>
        <div class="field field-wide">
          <label for="message">${t(lang, "seenDoing")} (${t(lang, "optional")})</label>
          <textarea id="message" name="message" maxlength="1000" rows="3"></textarea>
        </div>
        <div class="field field-wide">
          <label>${t(lang, "photoUpload")} (${t(lang, "optional")}, max 3 MB)</label>
          <div class="photo-picker">
            <div class="photo-picker-actions">
              <label for="photo-capture" class="photo-action">${t(lang, "takePhoto")}</label>
              <label for="photo-upload" class="photo-action">${t(lang, "chooseExistingPhoto")}</label>
            </div>
            <input class="photo-input-visually-hidden" type="file" id="photo-capture" name="photoCapture" accept="image/*" capture="environment" />
            <input class="photo-input-visually-hidden" type="file" id="photo-upload" name="photoUpload" accept="image/*" />
            <div id="sighting-photo-status" class="photo-status">${t(lang, "noPhotoSelected")}</div>
          </div>
        </div>
        <div class="field">
          <label for="reporterName">${t(lang, "yourName")} (${t(lang, "optional")})</label>
          <input type="text" id="reporterName" name="reporterName" maxlength="80" />
        </div>
        <div class="field">
          <label for="reporterContact">${t(lang, "yourContact")} (${t(lang, "optional")})</label>
          <input type="text" id="reporterContact" name="reporterContact" maxlength="120" />
        </div>
      </div>
      <div class="submit-row">
        <button class="mp-btn mp-btn-primary" type="submit">${t(lang, "submitSighting")}</button>
        <a class="mp-btn mp-btn-secondary" href="/c/${safeId}?lang=${lang}">${t(lang, "cancel")}</a>
      </div>
    </form>
  </section>
  </main>
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
  <style>${MISHIPASS_DESIGN_CSS}body{padding:var(--space-3)}.message-shell{max-width:560px;margin:var(--space-6) auto}.message-card{padding:var(--space-4);margin-top:var(--space-3)}@media(max-width:430px){body{padding:var(--space-2)}.message-card{padding:var(--space-3)}}</style>
</head>
<body>
  <main class="message-shell">
    ${brandLockupHtml(`/?lang=${lang}`)}
  <section class="mp-card message-card">
    <p>${t(lang, "sightingSubmitted")}</p>
    <p><a class="mp-btn mp-btn-primary" href="/c/${safeId}?lang=${lang}">${t(lang, "backToProfile")}</a></p>
  </section>
  </main>
</body>
</html>`;
}
