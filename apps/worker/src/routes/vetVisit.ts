/**
 * Vet Visit mode route handlers.
 *
 * Day 7 implementation decisions:
 * - Access is purely mode-gated (no vet token required). Known Beta limitation:
 *   anyone scanning the QR while Vet Visit is active can submit.
 * - Expiry rule: 24 hours from activation OR Save & Finish, whichever first.
 * - Save & Finish returns cat to Active Profile immediately.
 */

import { validateId } from "@mishipass/shared-validation";
import {
  findLatestVetSession,
  finishVetSession,
  insertVetSession,
  updateCatMode,
  getCatPublicProfile,
} from "../db/index.js";
import type { RequestContext } from "../middleware/session.js";
import { escapeHtml, htmlResponse } from "../utils/html.js";
import { getLanguageFromRequest, type LanguageCode, t } from "../utils/i18n.js";
import { getCountryBadgeLabel } from "../data/countries.js";
import { checkMagicBytes } from "./photos.js";

// ── Constants ────────────────────────────────────────────────────────────────

const VET_SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_FIELD_LENGTH = 500;
const ALLOWED_STICKER_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_STICKER_PHOTO_SIZE = 2 * 1024 * 1024;

// ── POST /api/cats/:publicId/vet-visit/start — Owner activation ─────────────

export async function handleStartVetVisit(
  publicId: string,
  db: D1Database,
  ctx: RequestContext,
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!validateId(publicId)) {
    return new Response("Not Found", { status: 404 });
  }

  // Switch mode — ownership enforced inside updateCatMode
  const updated = await updateCatMode(db, publicId, ctx.ownerId, "vet");
  if (!updated) {
    return new Response("Forbidden", { status: 403 });
  }

  // Create vet session record
  const now = new Date();
  const expiresAt = new Date(now.getTime() + VET_SESSION_DURATION_MS);

  await insertVetSession(db, {
    catPublicId: publicId,
    ownerId: ctx.ownerId,
    token_hash: null, // mode-gated, no token
    activated_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    status: "active",
  });

  return Response.json(
    { status: "vet_visit_active", expires_at: expiresAt.toISOString() },
    { status: 200 },
  );
}

// ── POST /api/cats/:publicId/vet-visit/cancel — Owner cancellation ──────────

export async function handleCancelVetVisit(
  publicId: string,
  db: D1Database,
  ctx: RequestContext,
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!validateId(publicId)) {
    return new Response("Not Found", { status: 404 });
  }

  // Return cat to active — ownership enforced inside updateCatMode
  const updated = await updateCatMode(db, publicId, ctx.ownerId, "active");
  if (!updated) {
    return new Response("Forbidden", { status: 403 });
  }

  // Mark session finished (uses owner verification internally)
  await finishVetSession(db, publicId, ctx.ownerId);

  return Response.json({ status: "returned_to_active" }, { status: 200 });
}

// ── GET /c/:publicId — Vet Visit public page ────────────────────────────────

export async function renderVetVisitPage(
  publicId: string,
  catName: string,
  countryCode: string,
  photoR2Key: string | null,
  db: D1Database,
  lang: LanguageCode = "en",
): Promise<Response> {
  // Check for active, unexpired vet session
  const session = await findLatestVetSession(db, publicId);

  if (!session || session.status !== "active" || new Date(session.expires_at) <= new Date()) {
    // Session expired or not active — show expired page
    return htmlResponse(renderExpiredPage(catName, lang));
  }

  // Render vet visit form
  return htmlResponse(renderVetForm(publicId, catName, countryCode, photoR2Key, session.expires_at, lang));
}

// ── POST /api/cats/:publicId/vet-visit/finish — Public Save & Finish ────────

export async function handleVetVisitFinish(
  publicId: string,
  request: Request,
  db: D1Database,
  photos?: R2Bucket,
): Promise<Response> {
  const lang = getLanguageFromRequest(request);
  if (!validateId(publicId)) {
    return new Response("Not Found", { status: 404 });
  }

  // Load cat
  const cat = await getCatPublicProfile(db, publicId);
  if (!cat) {
    return new Response("Not Found", { status: 404 });
  }

  // Require vet mode
  if (cat.current_mode !== "vet") {
    return htmlResponse(renderNotVetModePage(cat.name, lang), 403);
  }

  // Check active unexpired session
  const session = await findLatestVetSession(db, publicId);
  if (!session || session.status !== "active" || new Date(session.expires_at) <= new Date()) {
    return htmlResponse(renderExpiredPage(cat.name, lang), 403);
  }

  // Parse form body
  let body: Record<string, string> = {};
  let formData: FormData | null = null;
  const contentType = request.headers.get("Content-Type") || "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    for (const [key, value] of params.entries()) {
      body[key] = value;
    }
  } else if (contentType.includes("application/json")) {
    try {
      const json = await request.json();
      if (typeof json === "object" && json !== null) {
        body = json as Record<string, string>;
      }
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }
  } else if (contentType.includes("multipart/form-data")) {
    try {
      formData = await request.formData();
    } catch {
      return new Response("Invalid form data", { status: 400 });
    }
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") body[key] = value;
    }
  } else {
    return new Response("Unsupported Content-Type", { status: 400 });
  }

  if (hasAdviceLikeFields(body)) {
    return Response.json({ error: "Medication Record stores documentation only" }, { status: 400 });
  }

  // Validate and extract fields
  const clinicName = typeof body.clinic_name === "string" ? body.clinic_name.slice(0, MAX_FIELD_LENGTH) : null;
  const vetName = typeof body.vet_name === "string" ? body.vet_name.slice(0, MAX_FIELD_LENGTH) : null;
  const visitDate = typeof body.visit_date === "string" ? body.visit_date.slice(0, 30) : new Date().toISOString().split("T")[0]!;
  const reason = typeof body.reason === "string" ? body.reason.slice(0, MAX_FIELD_LENGTH) : null;
  const weight = typeof body.weight === "string" ? body.weight.slice(0, 30) : null;
  const notes = typeof body.notes === "string" ? body.notes.slice(0, MAX_FIELD_LENGTH) : null;

  // Compose the vet_or_clinic_name combining vet_name and clinic_name
  let vetOrClinicName: string | null = null;
  if (vetName && clinicName) {
    vetOrClinicName = `${vetName} — ${clinicName}`;
  } else if (vetName) {
    vetOrClinicName = vetName;
  } else if (clinicName) {
    vetOrClinicName = clinicName;
  }

  // Compose notes from reason, weight, and notes
  const noteParts: string[] = [];
  if (reason) noteParts.push(`Reason: ${reason}`);
  if (weight) noteParts.push(`Weight: ${weight}`);
  if (notes) noteParts.push(notes);
  const composedNotes = noteParts.length > 0 ? noteParts.join("\n") : null;

  // Save vet visit record — need to get cat internal id via a direct insert
  // Use a raw query that resolves cat_id from public_id (no owner check since
  // this is a public vet submit, and the mode gate is the access control)
  await db
    .prepare(
      `INSERT INTO vet_visits (cat_id, visit_date, vet_or_clinic_name, notes)
       VALUES ((SELECT id FROM cats WHERE public_id = ?), ?, ?, ?)`,
    )
    .bind(publicId, visitDate, vetOrClinicName, composedNotes)
    .run();

  const vaccineNames = collectIndexed(body, "vaccine_name");
  for (let i = 0; i < vaccineNames.length; i++) {
    const vaccineName = vaccineNames[i]!.slice(0, 100);
    if (!vaccineName) continue;
    let stickerKey: string | null = null;
    const stickerField = i === 0 ? "vaccine_sticker_photo" : `vaccine_sticker_photo_${i + 1}`;
    const stickerCaptureField = i === 0 ? "vaccine_sticker_photo_capture" : `vaccine_sticker_photo_capture_${i + 1}`;
    const stickerUploadField = i === 0 ? "vaccine_sticker_photo_upload" : `vaccine_sticker_photo_upload_${i + 1}`;
    if (formData && photos) {
      const file = formData.get(stickerField) || formData.get(stickerCaptureField) || formData.get(stickerUploadField);
      if (file && typeof file !== "string") {
        const uploaded = await uploadVetStickerPhoto(publicId, file as File, photos);
        if (uploaded instanceof Response) return uploaded;
        stickerKey = uploaded;
      }
    }
    await db
      .prepare(
        `INSERT INTO vaccines (cat_id, vaccine_name, date_given, sticker_photo_r2_key)
         VALUES ((SELECT id FROM cats WHERE public_id = ?), ?, ?, ?)`,
      )
      .bind(publicId, vaccineName, indexedValue(body, "vaccine_date", i)?.slice(0, 30) ?? null, stickerKey)
      .run();
  }

  const medicationNames = collectIndexed(body, "medication_name");
  for (let i = 0; i < medicationNames.length; i++) {
    const medicationName = medicationNames[i]!.slice(0, 100);
    if (!medicationName) continue;
    await db
      .prepare(
        `INSERT INTO medications
           (cat_id, medication_name, dose, duration, start_date, prescriber_name, notes)
         VALUES ((SELECT id FROM cats WHERE public_id = ?), ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        publicId,
        medicationName,
        indexedValue(body, "medication_dose", i)?.slice(0, 100) ?? null,
        indexedValue(body, "medication_duration", i)?.slice(0, 100) ?? null,
        indexedValue(body, "medication_start_date", i)?.slice(0, 30) ?? null,
        indexedValue(body, "medication_prescriber", i)?.slice(0, 100) ?? null,
        indexedValue(body, "medication_notes", i)?.slice(0, MAX_FIELD_LENGTH) ?? null,
      )
      .run();
  }

  // Mark vet session finished — use a direct query since there's no owner for public submit
  await db
    .prepare(
      `UPDATE vet_sessions
       SET status = 'finished'
       WHERE cat_id = (SELECT id FROM cats WHERE public_id = ?)
         AND status = 'active'`,
    )
    .bind(publicId)
    .run();

  // Return cat to active mode
  await db
    .prepare(`UPDATE cats SET current_mode = 'active' WHERE public_id = ?`)
    .bind(publicId)
    .run();

  return htmlResponse(renderSuccessPage(cat.name, lang));
}

// ── HTML Renderers ──────────────────────────────────────────────────────────

function renderVetForm(
  publicId: string,
  name: string,
  countryCode: string,
  photoR2Key: string | null,
  expiresAt: string,
  lang: LanguageCode,
): string {
  const safeName = escapeHtml(name);
  const safeId = escapeHtml(publicId);
  const safeCountry = escapeHtml(getCountryBadgeLabel(countryCode));
  const safeExpiry = escapeHtml(new Date(expiresAt).toLocaleString("en-US", { timeZone: "UTC" }));

  const photoSection = photoR2Key
    ? `<div class="photo"><img src="/media/cats/${safeId}/photo" alt="${safeName}" /></div>`
    : "";

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeName} — ${t(lang, "vetVisit")} — MishiPass</title>
  <style>
    *{box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:1.5rem auto;padding:0 1rem;color:#111;line-height:1.5}
    h1{font-size:1.5rem;margin-bottom:0.25rem}
    .badge{display:inline-block;background:#eee;padding:2px 8px;border-radius:4px;font-size:0.875rem}
    .vet-badge{background:#e0f0ff;color:#036;padding:4px 10px;border-radius:4px;font-size:0.8rem;font-weight:bold;display:inline-block;margin-bottom:1rem}
    .photo img{width:80px;height:80px;border-radius:50%;object-fit:cover;margin:0.75rem 0}
    .expiry{font-size:0.8rem;color:#666;margin-bottom:1rem}
    label{display:block;margin-bottom:0.25rem;font-size:0.875rem;font-weight:500;margin-top:0.75rem}
    input[type="text"],input[type="date"],textarea{width:100%;padding:0.65rem;border:1px solid #ccc;border-radius:6px;font-size:1rem;min-height:44px}
    textarea{min-height:80px;resize:vertical}
    .submit-btn{display:block;width:100%;min-height:44px;margin-top:1.25rem;padding:0.75rem;background:#036;color:#fff;border:none;border-radius:6px;font-size:1rem;cursor:pointer}
    .submit-btn:hover{background:#024}
    .note{font-size:0.8rem;color:#555;margin-top:1rem;padding:0.5rem;background:#f9f9f9;border-radius:4px}
    .photo-picker{margin:.35rem 0 .85rem}.photo-picker-actions{display:flex;gap:.55rem;flex-wrap:wrap}.photo-action{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:.62rem .85rem;background:#eee;border-radius:6px;cursor:pointer;font-weight:700;text-align:center;line-height:1.2;flex:1 1 155px}.photo-input-visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}.photo-status{font-size:.85rem;color:#666;margin-top:.4rem;overflow-wrap:anywhere}
    @media(max-width:430px){body{margin:1rem auto;padding:0 .85rem}.photo-action{flex-basis:100%}h1{font-size:1.35rem}}
  </style>
</head>
<body>
  <h1>${safeName} <span class="badge">${safeCountry}</span></h1>
  ${photoSection}
  <span class="vet-badge">${t(lang, "vetVisit")}</span>
  <p class="expiry">Session expires: ${safeExpiry} UTC</p>

  <form method="POST" action="/api/cats/${safeId}/vet-visit/finish?lang=${lang}" enctype="multipart/form-data">
    <label for="clinic_name">${t(lang, "clinicName")} (optional)</label>
    <input type="text" id="clinic_name" name="clinic_name" maxlength="500" />

    <label for="vet_name">${t(lang, "vetName")} (optional)</label>
    <input type="text" id="vet_name" name="vet_name" maxlength="500" />

    <label for="visit_date">${t(lang, "visitDate")}</label>
    <input type="date" id="visit_date" name="visit_date" />

    <label for="reason">${t(lang, "reason")} (optional)</label>
    <input type="text" id="reason" name="reason" maxlength="500" />

    <label for="weight">${t(lang, "weight")} (optional)</label>
    <input type="text" id="weight" name="weight" maxlength="30" placeholder="e.g. 4.5 kg" />

    <label for="notes">Notes (optional)</label>
    <textarea id="notes" name="notes" maxlength="500"></textarea>

    <h2>Vaccines</h2>
    <label for="vaccine_name">Vaccine name (optional)</label>
    <input type="text" id="vaccine_name" name="vaccine_name" maxlength="100" />
    <label for="vaccine_date">Date given (optional)</label>
    <input type="date" id="vaccine_date" name="vaccine_date" />
    <label>Vaccine sticker photo (optional)</label>
    <div class="photo-picker">
      <div class="photo-picker-actions">
        <label class="photo-action" for="vaccine_sticker_photo_capture">${t(lang, "takePhoto")}</label>
        <label class="photo-action" for="vaccine_sticker_photo_upload">${t(lang, "chooseExistingPhoto")}</label>
      </div>
      <input class="photo-input-visually-hidden" type="file" id="vaccine_sticker_photo_capture" name="vaccine_sticker_photo_capture" accept="image/*" capture="environment" data-photo-status="vaccine-sticker-status" />
      <input class="photo-input-visually-hidden" type="file" id="vaccine_sticker_photo_upload" name="vaccine_sticker_photo_upload" accept="image/*" data-photo-status="vaccine-sticker-status" />
      <div id="vaccine-sticker-status" class="photo-status">${t(lang, "noPhotoSelected")}</div>
    </div>

    <h2>${t(lang, "medicationRecord")}</h2>
    <label for="medication_name">Medication name (optional)</label>
    <input type="text" id="medication_name" name="medication_name" maxlength="100" />
    <label for="medication_dose">Dose as recorded (optional)</label>
    <input type="text" id="medication_dose" name="medication_dose" maxlength="100" />
    <label for="medication_duration">Duration (optional)</label>
    <input type="text" id="medication_duration" name="medication_duration" maxlength="100" />
    <label for="medication_start_date">Start date (optional)</label>
    <input type="date" id="medication_start_date" name="medication_start_date" />
    <label for="medication_prescriber">Prescriber (optional)</label>
    <input type="text" id="medication_prescriber" name="medication_prescriber" maxlength="100" />
    <label for="medication_notes">Medication notes (optional)</label>
    <textarea id="medication_notes" name="medication_notes" maxlength="500"></textarea>

    <button type="submit" class="submit-btn">${t(lang, "saveFinishVisit")}</button>
  </form>

  <p class="note">This visit record will be saved to the cat's private health history. No medical history is shown on this page. The QR will return to Active Profile after submission.</p>
</body>
</html>`;
}

function indexedValue(body: Record<string, string>, base: string, index: number): string | null {
  const key = index === 0 ? base : `${base}_${index + 1}`;
  const value = body[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function collectIndexed(body: Record<string, string>, base: string): string[] {
  const values: string[] = [];
  for (let i = 0; i < 10; i++) {
    const value = indexedValue(body, base, i);
    if (value) values.push(value);
  }
  return values;
}

function hasAdviceLikeFields(body: Record<string, string>): boolean {
  const blocked = ["recommendation", "reminder_at", "next_dose", "interaction_check", "refill_at", "treatment_plan", "advice"];
  return blocked.some(key => key in body);
}

async function uploadVetStickerPhoto(publicId: string, file: File, photos: R2Bucket): Promise<string | Response> {
  if (!ALLOWED_STICKER_TYPES.has(file.type)) {
    return Response.json({ error: "Invalid file type. Allowed: JPEG, PNG, WebP" }, { status: 400 });
  }
  if (file.size > MAX_STICKER_PHOTO_SIZE) {
    return Response.json({ error: "File too large. Maximum 2 MB" }, { status: 400 });
  }
  const buffer = await file.arrayBuffer();
  const headerView = new Uint8Array(buffer, 0, Math.min(12, buffer.byteLength));
  if (!checkMagicBytes(headerView, file.type)) {
    return Response.json({ error: "File content does not match declared type" }, { status: 400 });
  }
  const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, "0")).join("");
  const objectKey = `vaccines/${publicId}/vet-visit/${hex}.${ext}`;
  await photos.put(objectKey, buffer, { httpMetadata: { contentType: file.type } });
  return objectKey;
}

function renderExpiredPage(name: string, lang: LanguageCode = "en"): string {
  const safeName = escapeHtml(name);
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeName} — Session Expired — MishiPass</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:2rem auto;padding:0 1rem;color:#111;line-height:1.5}
    h1{font-size:1.5rem}
    .expired{background:#fff3cd;color:#856404;padding:1rem;border-radius:6px;margin:1rem 0}
  </style>
</head>
<body>
  <h1>${safeName}</h1>
  <div class="expired">
    <strong>Vet Visit session has expired or been completed.</strong>
    <p>The owner can start a new Vet Visit from their dashboard if needed.</p>
  </div>
</body>
</html>`;
}

function renderNotVetModePage(name: string, lang: LanguageCode = "en"): string {
  const safeName = escapeHtml(name);
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeName} — MishiPass</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:2rem auto;padding:0 1rem;color:#111;line-height:1.5}
  </style>
</head>
<body>
  <h1>${safeName}</h1>
  <p>This cat is not currently in Vet Visit mode. The visit cannot be submitted.</p>
</body>
</html>`;
}

function renderSuccessPage(name: string, lang: LanguageCode = "en"): string {
  const safeName = escapeHtml(name);
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Visit Saved — MishiPass</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:2rem auto;padding:0 1rem;color:#111;line-height:1.5}
    .success{background:#d4edda;color:#155724;padding:1rem;border-radius:6px;margin:1rem 0}
  </style>
</head>
<body>
  <h1>${safeName}</h1>
  <div class="success">
    <strong>Visit saved.</strong>
    <p>This QR has returned to Active Profile. The visit record is stored in the owner's private health history.</p>
  </div>
</body>
</html>`;
}
