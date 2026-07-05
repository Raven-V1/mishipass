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
import { ILLUSTRATION_MISSING_EMPTY_SRC } from "../utils/designAssets.js";
import { renderIllustratedStatePage } from "../utils/designPages.js";

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
  let lat: number | null = null;
  let lng: number | null = null;
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
      const latRaw = typeof b["lat"] === "number" ? b["lat"] : parseFloat(String(b["lat"] ?? ""));
      const lngRaw = typeof b["lng"] === "number" ? b["lng"] : parseFloat(String(b["lng"] ?? ""));
      if (Number.isFinite(latRaw) && Number.isFinite(lngRaw)) { lat = latRaw; lng = lngRaw; }
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
    const latStr = formData.get("lat") as string | null;
    const lngStr = formData.get("lng") as string | null;
    if (latStr && lngStr) {
      const lv = parseFloat(latStr), lgv = parseFloat(lngStr);
      if (Number.isFinite(lv) && Number.isFinite(lgv)) { lat = lv; lng = lgv; }
    }

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
    const latStrU = formData.get("lat") as string | null;
    const lngStrU = formData.get("lng") as string | null;
    if (latStrU && lngStrU) {
      const lv = parseFloat(latStrU), lgv = parseFloat(lngStrU);
      if (Number.isFinite(lv) && Number.isFinite(lgv)) { lat = lv; lng = lgv; }
    }
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
    lat,
    lng,
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
  return renderIllustratedStatePage({
    lang,
    title: t(lang, "reportSighting"),
    subtitle: t(lang, "sightingClosed"),
    imageSrc: ILLUSTRATION_MISSING_EMPTY_SRC,
    ctaHref: "/",
    ctaLabel: "Go Home",
  });
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
    .page-shell{max-width:1120px;margin:var(--space-3) auto;padding-bottom:var(--space-6)}
    .form-shell{padding:var(--space-4);margin-top:var(--space-2)}
    .sighting-head{display:flex;align-items:center;gap:var(--space-2);margin:0 0 var(--space-1)}
    .sighting-head h1{font-size:clamp(2.25rem,6vw,3.5rem);line-height:1.02;margin:0;color:var(--teal)}
    .sighting-sub{color:var(--muted);font-weight:700;margin:0 0 var(--space-4);font-size:1rem}
    .form-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:var(--space-3)}
    .field{display:grid;gap:var(--space-1);margin-bottom:0}
    .field label{font-size:.875rem;font-weight:900;color:var(--teal)}
    .required-mark{color:var(--brand-coral);font-size:.75rem;margin-left:2px}
    .field-card{border:1px solid var(--line);border-radius:8px;padding:var(--space-2);background:#fff;box-shadow:0 10px 24px rgba(56,38,26,.05)}
    .field-stack{display:grid;gap:var(--space-2)}
    .field-wide{grid-column:1/-1}
    .field-split{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2)}
    .photo-picker{margin:0}.photo-picker-actions{display:flex;gap:var(--space-1);flex-wrap:wrap}.photo-action{flex:1 1 160px}.photo-input-visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}.photo-status{margin-top:var(--space-1);overflow-wrap:anywhere;font-size:.875rem;color:var(--muted)}
    .submit-row{display:flex;gap:var(--space-2);flex-wrap:wrap;margin-top:var(--space-3)}.submit-row>*{flex:1 1 220px}
    .submit-row .mp-btn-primary{background:var(--green);border-color:var(--green)}
    .map-section{margin-bottom:0}
    .map-section label{font-size:.875rem;font-weight:900;color:var(--teal);display:block;margin-bottom:var(--space-1)}
    .map-hint{font-size:.8125rem;color:var(--muted);margin:0 0 var(--space-1)}
    #sighting-map{position:relative;width:100%;height:280px;border-radius:8px;border:1px solid var(--line);overflow:hidden;background:
      radial-gradient(circle at 20% 22%, rgba(255,255,255,.9) 0 10%, transparent 11%),
      radial-gradient(circle at 78% 68%, rgba(255,255,255,.7) 0 8%, transparent 9%),
      linear-gradient(0deg, rgba(255,255,255,.18) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.18) 1px, transparent 1px),
      linear-gradient(135deg,#d8efe8 0%,#eaf7f3 38%,#f8efe6 100%);
      background-size:auto,auto,48px 48px,48px 48px,100% 100%;
      cursor:crosshair}
    #sighting-map::before{content:"";position:absolute;inset:14px;border-radius:8px;border:1px dashed rgba(36,119,110,.24);pointer-events:none}
    .map-pin{position:absolute;width:18px;height:18px;border-radius:50% 50% 50% 0;background:var(--brand-coral);border:2px solid #fff;box-shadow:0 8px 18px rgba(0,0,0,.18);transform:translate(-50%,-100%) rotate(-45deg);display:none;pointer-events:none}
    .map-pin::after{content:"";position:absolute;inset:4px;border-radius:50%;background:#fff}
    .map-overlay{position:absolute;left:14px;right:14px;bottom:14px;display:flex;align-items:flex-end;justify-content:space-between;gap:var(--space-2);pointer-events:none}
    .map-caption,.map-area-label{background:rgba(255,253,249,.94);border:1px solid rgba(56,38,26,.1);border-radius:8px;padding:.55rem .7rem;box-shadow:0 10px 24px rgba(56,38,26,.08)}
    .map-caption{max-width:280px;font-size:.8125rem;font-weight:800;color:var(--teal)}
    .map-area-label{font-size:.75rem;font-weight:900;color:var(--muted);text-transform:uppercase;letter-spacing:0}
    .map-toolbar{display:flex;gap:var(--space-1);flex-wrap:wrap;margin-top:var(--space-1)}
    .map-toolbar button{flex:1 1 160px}
    .map-coords{font-size:.8125rem;color:var(--teal);font-weight:700;margin-top:var(--space-1);min-height:1.2em}
    .placeholder-photo{display:flex;align-items:center;justify-content:center;min-height:220px;border-radius:8px;background:linear-gradient(135deg,#fff7f0,#eef8f5);border:1px dashed #e7d3ca;text-align:center;color:var(--muted);font-weight:800}
    .placeholder-photo span{display:block}
    .contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);margin-top:var(--space-2)}
    @media(max-width:600px){.form-grid,.field-split,.contact-grid{grid-template-columns:1fr}.field-wide{grid-column:1}}
    @media(max-width:430px){body{padding:var(--space-2)}.form-shell{padding:var(--space-3)}.photo-action,.submit-row>*{width:100%;flex-basis:100%}}
  </style>
</head>
<body>
  <main class="page-shell">
  ${brandLockupHtml(`/?lang=${lang}`)}
  <div class="nav"><a class="mp-back" href="/c/${safeId}?lang=${lang}">&larr; ${t(lang, "backToProfile")}</a></div>
  <section class="mp-card form-shell">
    <div class="sighting-head">
      <h1>${t(lang, "reportSighting")}</h1>
    </div>
    <p class="sighting-sub">${t(lang, "reportSightingSubtitle")}</p>
    <form method="POST" action="/c/${safeId}/sighting?lang=${lang}" enctype="multipart/form-data">
      <input type="hidden" name="lat" id="sighting-lat" value="" />
      <input type="hidden" name="lng" id="sighting-lng" value="" />
      <input type="hidden" name="sightedAt" id="sighted-at-hidden" value="" />
      <input type="hidden" name="message" id="message-hidden" value="" />
      <div class="form-grid">
        <div class="field-card field-stack">
          <div class="field">
            <label for="city">${t(lang, "locationText")}<span class="required-mark">${t(lang, "sightingRequired")}</span></label>
            <input type="text" id="city" name="city" required maxlength="80" placeholder="${t(lang, "locationText")}" />
          </div>
          <div class="field map-section">
          <label>${lang === "es" ? "Marcar ubicación en el mapa" : lang === "kk-KZ" ? "Картада орынды белгілеу" : "Pin location on map"}</label>
          <p class="map-hint">${lang === "es" ? "Haz clic en el mapa para marcar donde lo viste (opcional)" : lang === "kk-KZ" ? "Мысықты көрген жерді белгілеу үшін картаны басыңыз (міндетті емес)" : "Click the map to drop a pin where you spotted the cat"}</p>
          <div id="sighting-map" role="application" aria-label="${lang === "es" ? "Selector de ubicación aproximada" : lang === "kk-KZ" ? "Шамамен орналасу орнын таңдау" : "Approximate location picker"}">
            <div class="map-pin" id="sighting-map-pin"></div>
            <div class="map-overlay">
              <div class="map-caption">${lang === "es" ? "Marca un punto aproximado. No necesitas una dirección exacta." : lang === "kk-KZ" ? "Шамамен нүктені белгілеңіз. Нақты мекенжай қажет емес." : "Mark an approximate point. An exact address is not required."}</div>
              <div class="map-area-label">${lang === "es" ? "Área aproximada" : lang === "kk-KZ" ? "Шамамен аймақ" : "Approximate area"}</div>
            </div>
          </div>
          <div class="map-toolbar">
            <button type="button" class="mp-btn mp-btn-secondary" id="map-use-location">${lang === "es" ? "Usar mi ubicación" : lang === "kk-KZ" ? "Менің орнымды қолдану" : "Use my location"}</button>
            <button type="button" class="mp-btn mp-btn-secondary" id="map-clear-location">${lang === "es" ? "Borrar punto" : lang === "kk-KZ" ? "Нүктені өшіру" : "Clear pin"}</button>
          </div>
          <p class="map-coords" id="map-coords-display"></p>
        </div>
        <div class="field">
          <label for="healthCondition">${t(lang, "healthCondition")}</label>
          <select id="healthCondition" name="healthCondition">${healthOptions}</select>
        </div>
        <div class="field">
          <label>${t(lang, "uploadPhotosOptional")}</label>
          <div class="placeholder-photo"><span>${t(lang, "noPhoto")}<br />${t(lang, "photoUpload")}</span></div>
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
        </div>
        <div class="field-card field-stack">
          <div class="field-split">
            <div class="field">
              <label for="sighting-date">${t(lang, "dateLabel")}</label>
              <input type="date" id="sighting-date" maxlength="30" />
            </div>
            <div class="field">
              <label for="sighting-time">${t(lang, "timeLabel")}</label>
              <input type="time" id="sighting-time" maxlength="10" />
            </div>
          </div>
          <div class="field">
            <label for="seen-doing">${t(lang, "seenDoing")}</label>
            <textarea id="seen-doing" maxlength="200" rows="4"></textarea>
          </div>
          <div class="field">
            <label for="additional-notes">${t(lang, "additionalNotesOptional")}</label>
            <textarea id="additional-notes" maxlength="300" rows="5"></textarea>
          </div>
          <div class="contact-grid">
            <div class="field">
              <label for="area">${t(lang, "area")}</label>
              <input type="text" id="area" name="area" maxlength="120" />
            </div>
            <div class="field">
              <label for="reporterName">${t(lang, "yourName")}</label>
              <input type="text" id="reporterName" name="reporterName" maxlength="80" />
            </div>
            <div class="field field-wide">
              <label for="reporterContact">${t(lang, "yourContact")}</label>
              <input type="text" id="reporterContact" name="reporterContact" maxlength="120" />
            </div>
          </div>
        </div>
      </div>
      <div class="submit-row">
        <a class="mp-btn mp-btn-secondary" href="/c/${safeId}?lang=${lang}">${t(lang, "cancel")}</a>
        <button class="mp-btn mp-btn-primary" type="submit">${t(lang, "submitSighting")}</button>
      </div>
    </form>
  </section>
  </main>
  <script>
  (function(){
    var latInput=document.getElementById("sighting-lat");
    var lngInput=document.getElementById("sighting-lng");
    var coordsDisplay=document.getElementById("map-coords-display");
    var map=document.getElementById("sighting-map");
    var pin=document.getElementById("sighting-map-pin");
    var useLocationBtn=document.getElementById("map-use-location");
    var clearLocationBtn=document.getElementById("map-clear-location");
    var photoCapture=document.getElementById("photo-capture");
    var photoUpload=document.getElementById("photo-upload");
    var photoStatus=document.getElementById("sighting-photo-status");
    var dateInput=document.getElementById("sighting-date");
    var timeInput=document.getElementById("sighting-time");
    var sightedAtHidden=document.getElementById("sighted-at-hidden");
    var seenDoingInput=document.getElementById("seen-doing");
    var additionalNotesInput=document.getElementById("additional-notes");
    var messageHidden=document.getElementById("message-hidden");
    function updateCoords(lat,lng){
      latInput.value=lat.toFixed(6);
      lngInput.value=lng.toFixed(6);
      if(coordsDisplay)coordsDisplay.textContent=latInput.value+", "+lngInput.value;
    }
    function placePinFromRatio(xRatio,yRatio){
      if(!map||!pin)return;
      var clampedX=Math.max(0,Math.min(1,xRatio));
      var clampedY=Math.max(0,Math.min(1,yRatio));
      pin.style.left=(clampedX*100)+"%";
      pin.style.top=(clampedY*100)+"%";
      pin.style.display="block";
      var lat=(90-(clampedY*180));
      var lng=((clampedX*360)-180);
      updateCoords(lat,lng);
    }
    function clearPin(){
      latInput.value="";
      lngInput.value="";
      if(coordsDisplay)coordsDisplay.textContent="";
      if(pin)pin.style.display="none";
    }
    if(map){
      map.addEventListener("click",function(e){
        var rect=map.getBoundingClientRect();
        var x=(e.clientX-rect.left)/rect.width;
        var y=(e.clientY-rect.top)/rect.height;
        placePinFromRatio(x,y);
      });
    }
    if(useLocationBtn){
      useLocationBtn.addEventListener("click",function(){
        if(!navigator.geolocation){
          if(coordsDisplay)coordsDisplay.textContent=${JSON.stringify(lang === "es" ? "La geolocalización no está disponible en este dispositivo." : lang === "kk-KZ" ? "Бұл құрылғыда геолокация қолжетімсіз." : "Geolocation is not available on this device.")};
          return;
        }
        navigator.geolocation.getCurrentPosition(function(pos){
          var lat=pos.coords.latitude;
          var lng=pos.coords.longitude;
          var x=(lng+180)/360;
          var y=(90-lat)/180;
          placePinFromRatio(x,y);
        },function(){
          if(coordsDisplay)coordsDisplay.textContent=${JSON.stringify(lang === "es" ? "No se pudo obtener tu ubicación." : lang === "kk-KZ" ? "Орныңызды алу мүмкін болмады." : "Could not get your location.")};
        });
      });
    }
    if(clearLocationBtn){
      clearLocationBtn.addEventListener("click",clearPin);
    }
    function bindPhotoInput(input){
      if(!input||!photoStatus)return;
      input.addEventListener("change",function(){
        var file=input.files&&input.files[0];
        photoStatus.textContent=file?file.name:${JSON.stringify(t(lang, "noPhotoSelected"))};
      });
    }
    bindPhotoInput(photoCapture);
    bindPhotoInput(photoUpload);
    document.querySelector("form").addEventListener("submit",function(){
      var datePart=dateInput&&dateInput.value?dateInput.value:"";
      var timePart=timeInput&&timeInput.value?timeInput.value:"";
      if(sightedAtHidden){
        sightedAtHidden.value=datePart&&timePart?(datePart+"T"+timePart):datePart||timePart;
      }
      var seenText=seenDoingInput&&seenDoingInput.value?seenDoingInput.value.trim():"";
      var notesText=additionalNotesInput&&additionalNotesInput.value?additionalNotesInput.value.trim():"";
      if(messageHidden){
        messageHidden.value=seenText+(notesText?(seenText?"\\n\\n":"")+"Notes: "+notesText:"");
      }
    });
  })();
  </script>
</body>
</html>`;
}

function renderSuccessPage(publicId: string, lang: LanguageCode): string {
  const safeId = escapeHtml(publicId);
  return renderIllustratedStatePage({
    lang,
    title: t(lang, "sightingSubmitted"),
    subtitle: "Your report has been sent to the cat's owner.",
    imageSrc: ILLUSTRATION_MISSING_EMPTY_SRC,
    ctaHref: `/c/${safeId}?lang=${lang}`,
    ctaLabel: t(lang, "backToProfile"),
  });
}
