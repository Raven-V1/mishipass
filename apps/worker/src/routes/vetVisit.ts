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
import { resolveSession } from "../middleware/session.js";
import { iconStethoscope } from "../utils/icons.js";
import { MISHIPASS_DESIGN_CSS, brandLockupHtml, escapeHtml, htmlResponse } from "../utils/html.js";
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
  const visitTime = typeof body.visit_time === "string" ? body.visit_time.slice(0, 10) : null;
  const reason = typeof body.reason === "string" ? body.reason.slice(0, MAX_FIELD_LENGTH) : null;
  const diagnosis = typeof body.diagnosis === "string" ? body.diagnosis.slice(0, MAX_FIELD_LENGTH) : null;
  const treatment = typeof body.treatment === "string" ? body.treatment.slice(0, MAX_FIELD_LENGTH) : null;
  const followUpDate = typeof body.follow_up_date === "string" ? body.follow_up_date.slice(0, 30) : null;
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

  // Compose full visit datetime
  const visitDateTime = visitTime ? `${visitDate} ${visitTime}` : visitDate;

  // Compose notes from all documentation fields
  const noteParts: string[] = [];
  if (reason) noteParts.push(`Reason: ${reason}`);
  if (diagnosis) noteParts.push(`Diagnosis: ${diagnosis}`);
  if (treatment) noteParts.push(`Treatment: ${treatment}`);
  if (weight) noteParts.push(`Weight: ${weight}`);
  if (followUpDate) noteParts.push(`Follow-up: ${followUpDate}`);
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
    .bind(publicId, visitDateTime, vetOrClinicName, composedNotes)
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

  // Propagate weight to cat profile if recorded
  if (weight) {
    await db
      .prepare(`UPDATE cats SET weight = ? WHERE public_id = ?`)
      .bind(weight, publicId)
      .run();
  }

  // Return cat to active mode
  await db
    .prepare(`UPDATE cats SET current_mode = 'active' WHERE public_id = ?`)
    .bind(publicId)
    .run();

  // Check if the submitter has an authenticated owner session
  const ctx = await resolveSession(request, db);
  const hasOwnerSession = ctx.ownerId !== null;

  return htmlResponse(renderSuccessPage(cat.name, lang, hasOwnerSession));
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
    ${MISHIPASS_DESIGN_CSS}
    body{padding:var(--space-3)}
    .vet-shell{max-width:1040px;margin:0 auto;padding:var(--space-3) 0 var(--space-6)}
    .vet-card{padding:var(--space-4);margin-top:var(--space-3)}
    .vet-head{display:grid;gap:var(--space-1);margin-bottom:var(--space-3)}
    h1{display:flex;align-items:center;gap:var(--space-1);font-size:clamp(2rem,6vw,3rem);line-height:1.08;margin:0;color:var(--teal)}
    .vet-subtitle{margin:0;color:var(--muted);font-weight:700}
    .vet-layout{display:grid;grid-template-columns:minmax(240px,304px) minmax(0,1fr);gap:var(--space-4);align-items:start}
    .vet-badge{background:#e9f5ef;color:var(--teal);margin:var(--space-2) 0}
    .profile-column{display:grid;gap:var(--space-2)}
    .photo img,.photo-placeholder{width:100%;aspect-ratio:4/3;border-radius:8px;object-fit:cover;background:#fff7f0}
    .photo-placeholder{display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--muted);border:1px dashed #d8c8bd}
    .status-panel{padding:var(--space-3);border:1px solid var(--line);border-radius:8px;background:#fff7f0;margin:0}
    .expiry{font-size:0.875rem;color:var(--muted);margin:0}
    .visit-form{display:grid;gap:var(--space-3)}
    .form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-2) var(--space-3)}
    .field{display:grid;gap:var(--space-1)}
    .field-wide{grid-column:1/-1}
    .section-title{font-size:1.25rem;line-height:1.2;color:var(--teal);margin:0}
    .section-note{margin:0;color:var(--muted);font-size:.875rem}
    .form-section{display:grid;gap:var(--space-2)}
    .submit-row{display:flex;gap:var(--space-2);flex-wrap:wrap}
    .submit-btn{flex:1 1 220px;margin-top:0;background:var(--green);border-color:var(--green)}
    .cancel-btn{flex:1 1 180px}
    .note{font-size:0.875rem;color:var(--muted);margin:0;padding:var(--space-2);background:#fff7f0;border-radius:8px}
    .photo-picker{margin:var(--space-1) 0 var(--space-3)}.photo-picker-actions{display:flex;gap:var(--space-1);flex-wrap:wrap}.photo-action{flex:1 1 160px}.photo-input-visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}.photo-status{margin-top:var(--space-1);overflow-wrap:anywhere}
    .section-toggle{display:flex;align-items:center;gap:var(--space-1);cursor:pointer;margin:0}.section-toggle input{width:20px;min-height:20px;accent-color:var(--teal)}
    @media(max-width:860px){.vet-layout{grid-template-columns:1fr}.form-grid{grid-template-columns:1fr}}
    @media(max-width:430px){body{padding:var(--space-2)}.vet-shell{padding:var(--space-2) 0 var(--space-4)}.vet-card{padding:var(--space-3)}.photo-action{flex-basis:100%}.submit-row>*{flex-basis:100%}}
  </style>
</head>
<body>
  <main class="vet-shell">
  ${brandLockupHtml(`/?lang=${lang}`)}
  <section class="mp-card vet-card">
  <header class="vet-head">
    <h1>${iconStethoscope(32)} <span>${t(lang, "vetVisit")}</span></h1>
    <p class="vet-subtitle">${t(lang, "vetVisitSubtitle")}</p>
  </header>
  <div class="vet-layout">
    <aside class="profile-column">
      <h2>${safeName}</h2>
      <span class="badge">${safeCountry}</span>
      ${photoSection || `<div class="photo-placeholder">${t(lang, "noPhoto")}</div>`}
      <div class="status-panel"><span class="vet-badge">${t(lang, "vetVisitActive")}</span><p class="expiry">${t(lang, "sessionExpires")} ${safeExpiry} UTC</p></div>
      <p class="note">${t(lang, "vetDocNote")}</p>
    </aside>

    <form class="visit-form" method="POST" action="/api/cats/${safeId}/vet-visit/finish?lang=${lang}" enctype="multipart/form-data">
      <section class="form-section">
        <h2 class="section-title">${t(lang, "addNewVisit")}</h2>
        <div class="form-grid">
          <div class="field"><label for="clinic_name">${t(lang, "clinicName")} (${t(lang, "optional")})</label><input type="text" id="clinic_name" name="clinic_name" maxlength="500" /></div>
          <div class="field"><label for="vet_name">${t(lang, "vetName")} (${t(lang, "optional")})</label><input type="text" id="vet_name" name="vet_name" maxlength="500" /></div>
          <div class="field"><label for="visit_date">${t(lang, "visitDate")}</label><input type="date" id="visit_date" name="visit_date" /></div>
          <div class="field"><label for="visit_time">${t(lang, "visitTime")} (${t(lang, "optional")})</label><input type="time" id="visit_time" name="visit_time" /></div>
          <div class="field"><label for="weight">${t(lang, "weight")} (${t(lang, "optional")})</label><input type="text" id="weight" name="weight" maxlength="30" placeholder="e.g. 4.5 kg" /></div>
          <div class="field"><label for="follow_up_date">${t(lang, "followUpDate")} (${t(lang, "optional")})</label><input type="date" id="follow_up_date" name="follow_up_date" /></div>
          <div class="field field-wide"><label for="reason">${t(lang, "reason")} (${t(lang, "optional")})</label><input type="text" id="reason" name="reason" maxlength="500" /></div>
          <div class="field field-wide"><label for="diagnosis">${t(lang, "diagnosis")} (${t(lang, "optional")})</label><textarea id="diagnosis" name="diagnosis" maxlength="500" rows="3"></textarea></div>
          <div class="field field-wide"><label for="treatment">${t(lang, "treatment")} (${t(lang, "optional")})</label><textarea id="treatment" name="treatment" maxlength="500" rows="3"></textarea></div>
          <div class="field field-wide"><label for="notes">${t(lang, "notes")} (${t(lang, "optional")})</label><textarea id="notes" name="notes" maxlength="500"></textarea></div>
        </div>
      </section>

      <section class="form-section">
        <label class="section-toggle"><input type="checkbox" id="toggle-vaccines" onchange="document.getElementById('vaccine-fields').style.display=this.checked?'grid':'none'" /> <h2 class="section-title" style="display:inline">${t(lang, "vaccines")}</h2></label>
        <div class="form-grid toggle-section" id="vaccine-fields" style="display:none">
          <div class="field"><label for="vaccine_name">${t(lang, "vaccineName")} (${t(lang, "optional")})</label><input type="text" id="vaccine_name" name="vaccine_name" maxlength="100" /></div>
          <div class="field"><label for="vaccine_date">${t(lang, "dateGiven")} (${t(lang, "optional")})</label><input type="date" id="vaccine_date" name="vaccine_date" /></div>
          <div class="field field-wide"><label>${t(lang, "uploadDocuments")}</label>
            <div class="photo-picker">
              <div class="photo-picker-actions">
                <label class="photo-action" for="vaccine_sticker_photo_capture">${t(lang, "takePhoto")}</label>
                <label class="photo-action" for="vaccine_sticker_photo_upload">${t(lang, "chooseExistingPhoto")}</label>
              </div>
              <input class="photo-input-visually-hidden" type="file" id="vaccine_sticker_photo_capture" name="vaccine_sticker_photo_capture" accept="image/*" capture="environment" data-photo-status="vaccine-sticker-status" />
              <input class="photo-input-visually-hidden" type="file" id="vaccine_sticker_photo_upload" name="vaccine_sticker_photo_upload" accept="image/*" data-photo-status="vaccine-sticker-status" />
              <div id="vaccine-sticker-status" class="photo-status">${t(lang, "noPhotoSelected")}</div>
            </div>
          </div>
        </div>
      </section>

      <section class="form-section">
        <label class="section-toggle"><input type="checkbox" id="toggle-medications" onchange="document.getElementById('medication-fields').style.display=this.checked?'grid':'none'" /> <h2 class="section-title" style="display:inline">${t(lang, "medicationRecord")}</h2></label>
        <p class="section-note">${t(lang, "medicationDocNote")}</p>
        <div class="form-grid toggle-section" id="medication-fields" style="display:none">
          <div class="field"><label for="medication_name">${t(lang, "medicationName")} (${t(lang, "optional")})</label><input type="text" id="medication_name" name="medication_name" maxlength="100" /></div>
          <div class="field"><label for="medication_dose">${t(lang, "doseAsRecorded")} (${t(lang, "optional")})</label><input type="text" id="medication_dose" name="medication_dose" maxlength="100" /></div>
          <div class="field"><label for="medication_duration">${t(lang, "duration")} (${t(lang, "optional")})</label><input type="text" id="medication_duration" name="medication_duration" maxlength="100" /></div>
          <div class="field"><label for="medication_start_date">${t(lang, "startDate")} (${t(lang, "optional")})</label><input type="date" id="medication_start_date" name="medication_start_date" /></div>
          <div class="field"><label for="medication_prescriber">${t(lang, "prescriber")} (${t(lang, "optional")})</label><input type="text" id="medication_prescriber" name="medication_prescriber" maxlength="100" /></div>
          <div class="field field-wide"><label for="medication_notes">${t(lang, "medicationNotes")} (${t(lang, "optional")})</label><textarea id="medication_notes" name="medication_notes" maxlength="500"></textarea></div>
        </div>
      </section>

      <div class="submit-row">
        <button type="submit" class="submit-btn">${t(lang, "saveFinishVisit")}</button>
        <a class="mp-btn mp-btn-secondary cancel-btn" href="/c/${safeId}?lang=${lang}">${t(lang, "cancel")}</a>
      </div>
    </form>
  </div>
  </section>
  </main>
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
  <title>${safeName} — ${t(lang, "vetSessionExpiredTitle")} — MishiPass</title>
  <style>
    ${MISHIPASS_DESIGN_CSS}
    body{padding:var(--space-3)}
    .message-shell{max-width:560px;margin:var(--space-6) auto}.message-card{padding:var(--space-4);margin-top:var(--space-3)}
    h1{color:var(--teal)}
    .expired{background:#fff7d6;color:#6b4a00;padding:var(--space-2);border-radius:8px;margin:var(--space-2) 0}
    @media(max-width:430px){body{padding:var(--space-2)}.message-card{padding:var(--space-3)}}
  </style>
</head>
<body>
  <main class="message-shell">
    ${brandLockupHtml(`/?lang=${lang}`)}
  <section class="mp-card message-card">
    <h1>${safeName}</h1>
    <div class="expired">
      <strong>${t(lang, "vetSessionExpiredStr")}</strong>
      <p>${t(lang, "vetSessionExpiredBody")}</p>
    </div>
  </section>
  </main>
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
    ${MISHIPASS_DESIGN_CSS}
    body{padding:var(--space-3)}
    .message-shell{max-width:560px;margin:var(--space-6) auto}.message-card{padding:var(--space-4);margin-top:var(--space-3)}
    h1{color:var(--teal)}
    @media(max-width:430px){body{padding:var(--space-2)}.message-card{padding:var(--space-3)}}
  </style>
</head>
<body>
  <main class="message-shell">
    ${brandLockupHtml(`/?lang=${lang}`)}
  <section class="mp-card message-card">
    <h1>${safeName}</h1>
    <p>${t(lang, "vetNotActiveBody")}</p>
  </section>
  </main>
</body>
</html>`;
}

function renderSuccessPage(name: string, lang: LanguageCode = "en", showDashboardLink = false): string {
  const safeName = escapeHtml(name);
  const dashLink = showDashboardLink
    ? `<a href="/dashboard?lang=${lang}" style="display:inline-block;margin-top:16px;font-weight:800;color:var(--teal);text-decoration:none">${t(lang, "backToDashboard")}</a>`
    : "";
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t(lang, "visitSavedTitle")} — MishiPass</title>
  <style>
    ${MISHIPASS_DESIGN_CSS}
    body{padding:var(--space-3)}
    .message-shell{max-width:560px;margin:var(--space-6) auto}.message-card{padding:var(--space-4);margin-top:var(--space-3)}
    h1{color:var(--teal)}
    .success{background:#e9f5ef;color:var(--teal);padding:var(--space-2);border-radius:8px;margin:var(--space-2) 0}
    @media(max-width:430px){body{padding:var(--space-2)}.message-card{padding:var(--space-3)}}
  </style>
</head>
<body>
  <main class="message-shell">
    ${brandLockupHtml(`/?lang=${lang}`)}
  <section class="mp-card message-card">
    <h1>${safeName}</h1>
    <div class="success">
      <strong>${t(lang, "visitSaved")}</strong>
      <p>${t(lang, "visitSavedBody")}</p>
    </div>
    ${dashLink}
  </section>
  </main>
</body>
</html>`;
}
