import {
  getCatForOwner,
  getVetVisitForOwner,
  listMedications,
  listVaccines,
  listVetVisits,
} from "../db/index.js";
import type { MedicationEntry, VaccineEntry, VetVisitEntry } from "../db/index.js";
import type { RequestContext } from "../middleware/session.js";
import { escapeHtml, htmlResponse } from "../utils/html.js";
import { type LanguageCode, t } from "../utils/i18n.js";

function redirectDashboard(): Response {
  return new Response(null, { status: 302, headers: { Location: "/dashboard" } });
}

function dateOrEmpty(value: string | null): string {
  return value ? escapeHtml(value) : "Not recorded";
}

export async function handleCartillaPage(
  publicId: string,
  db: D1Database,
  ctx: RequestContext,
  lang: LanguageCode = "en",
): Promise<Response> {
  if (ctx.ownerId === null) return redirectDashboard();
  const cat = await getCatForOwner(db, publicId, ctx.ownerId);
  if (!cat) return new Response("Not Found", { status: 404 });

  const [vetVisits, vaccines, medications] = await Promise.all([
    listVetVisits(db, publicId, ctx.ownerId),
    listVaccines(db, publicId, ctx.ownerId),
    listMedications(db, publicId, ctx.ownerId),
  ]);

  const safeId = escapeHtml(publicId);
  const safeName = escapeHtml(cat.name);

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeName} — ${t(lang, "cartilla")}</title>
  <style>
    *{box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;max-width:780px;margin:1.5rem auto;padding:0 1rem;color:#111;line-height:1.5}
    h1{font-size:1.5rem;margin-bottom:0.25rem}
    h2{font-size:1.1rem;margin-top:1.5rem;border-bottom:1px solid #eee;padding-bottom:0.25rem}
    a{color:#111}.nav{font-size:0.875rem;margin-bottom:1.5rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:0.75rem}
    .record{border:1px solid #ddd;border-radius:6px;padding:0.75rem}.muted{color:#666;font-size:0.875rem}.notes{white-space:pre-wrap}
    label{display:block;margin-top:0.6rem;font-size:0.875rem;font-weight:600}input,textarea{width:100%;padding:0.65rem;border:1px solid #ccc;border-radius:6px;min-height:44px}
    textarea{min-height:70px}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;background:#111;color:#fff;border:0;border-radius:6px;padding:0.6rem 0.9rem;margin-top:0.75rem;text-decoration:none;cursor:pointer;text-align:center}
    .secondary{background:#eee;color:#111}.sticker{display:block;max-width:140px;max-height:100px;object-fit:cover;margin-top:0.5rem;border-radius:4px}
    .photo-picker{margin:.45rem 0 .75rem}.photo-picker-actions{display:flex;gap:.55rem;flex-wrap:wrap}.photo-action{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:.62rem .85rem;background:#eee;border-radius:6px;cursor:pointer;font-weight:700;text-align:center;line-height:1.2;flex:1 1 150px}.photo-input-visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}.photo-status{font-size:.85rem;color:#666;margin-top:.35rem;overflow-wrap:anywhere}
    @media(max-width:430px){body{margin:1rem auto;padding:0 .85rem}.grid{grid-template-columns:1fr}.photo-action,.btn{width:100%;flex-basis:100%}}
  </style>
</head>
<body>
  <div class="nav"><a href="/dashboard/cats/${safeId}?lang=${lang}">&larr; ${safeName}</a></div>
  <h1>${t(lang, "cartilla")}</h1>
  <p class="muted">${safeName} private owner records.</p>
  ${renderVetVisits(safeId, vetVisits, lang)}
  ${renderVaccines(safeId, vaccines, lang)}
  ${renderMedications(medications, lang)}
  ${renderForms(safeId, lang)}
  <script>
    (function(){
      function postJson(url, payload){ return fetch(url,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}); }
      var vaccineForm=document.getElementById("vaccine-form");
      vaccineForm.addEventListener("submit",function(e){e.preventDefault();var f=e.target;postJson("/api/cats/${safeId}/vaccines",{vaccine_name:f.vaccine_name.value,date_given:f.date_given.value}).then(function(r){if(r.ok) location.reload(); else r.text().then(alert);});});
      var medForm=document.getElementById("medication-form");
      medForm.addEventListener("submit",function(e){e.preventDefault();var f=e.target;postJson("/api/cats/${safeId}/medications",{medication_name:f.medication_name.value,dose:f.dose.value,duration:f.duration.value,start_date:f.start_date.value,prescriber_name:f.prescriber_name.value,notes:f.notes.value}).then(function(r){if(r.ok) location.reload(); else r.text().then(alert);});});
      document.querySelectorAll(".photo-input-visually-hidden").forEach(function(input){input.addEventListener("change",function(){var status=document.getElementById(input.getAttribute("data-photo-status"));if(status) status.textContent=input.files&&input.files[0]?input.files[0].name:${JSON.stringify(t(lang, "noPhotoSelected"))};});});
      var stickerForms=document.querySelectorAll(".sticker-form");
      for(var i=0;i<stickerForms.length;i++) stickerForms[i].addEventListener("submit",function(e){e.preventDefault();var f=e.target;var file=(f.photoCapture&&f.photoCapture.files[0])||(f.photoUpload&&f.photoUpload.files[0]);if(!file)return;var fd=new FormData();fd.append("photo",file);fetch(f.action,{method:"POST",credentials:"same-origin",body:fd}).then(function(r){if(r.ok) location.reload(); else r.text().then(alert);});});
    })();
  </script>
</body>
</html>`;
  return htmlResponse(html);
}

export async function handleVetVisitDetailPage(
  publicId: string,
  visitIdRaw: string,
  db: D1Database,
  ctx: RequestContext,
  lang: LanguageCode = "en",
): Promise<Response> {
  if (ctx.ownerId === null) return redirectDashboard();
  const visitId = Number.parseInt(visitIdRaw, 10);
  if (!Number.isSafeInteger(visitId) || visitId <= 0) return new Response("Not Found", { status: 404 });
  const cat = await getCatForOwner(db, publicId, ctx.ownerId);
  if (!cat) return new Response("Not Found", { status: 404 });
  const visit = await getVetVisitForOwner(db, publicId, ctx.ownerId, visitId);
  if (!visit) return new Response("Not Found", { status: 404 });

  const safeId = escapeHtml(publicId);
  const safeName = escapeHtml(cat.name);
  const html = `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${t(lang, "vetVisit")} — ${safeName}</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;max-width:620px;margin:2rem auto;padding:0 1rem;color:#111;line-height:1.5}.nav{font-size:0.875rem;margin-bottom:1.5rem}.field{margin:0.75rem 0}.label{font-size:0.8rem;color:#666;font-weight:600}.value{white-space:pre-wrap}</style></head>
<body>
  <div class="nav"><a href="/dashboard/cats/${safeId}/cartilla?lang=${lang}">&larr; ${t(lang, "cartilla")}</a></div>
  <h1>${t(lang, "vetVisit")}</h1>
  <div class="field"><div class="label">${t(lang, "visitDate")}</div><div class="value">${dateOrEmpty(visit.visit_date)}</div></div>
  <div class="field"><div class="label">Vet or clinic</div><div class="value">${visit.vet_or_clinic_name ? escapeHtml(visit.vet_or_clinic_name) : "Not recorded"}</div></div>
  <div class="field"><div class="label">Notes</div><div class="value">${visit.notes ? escapeHtml(visit.notes) : "Not recorded"}</div></div>
  <div class="field"><div class="label">Created</div><div class="value">${escapeHtml(visit.created_at)}</div></div>
</body></html>`;
  return htmlResponse(html);
}

function renderVetVisits(publicId: string, visits: VetVisitEntry[], lang: LanguageCode): string {
  if (visits.length === 0) return `<h2>${t(lang, "vetVisit")}</h2><p class="muted">${t(lang, "noMatches")}</p>`;
  return `<h2>${t(lang, "vetVisit")}</h2><div class="grid">${visits.map(v => `<div class="record"><strong>${dateOrEmpty(v.visit_date)}</strong><p>${v.vet_or_clinic_name ? escapeHtml(v.vet_or_clinic_name) : t(lang, "unknown")}</p><a class="btn secondary" href="/dashboard/cats/${publicId}/cartilla/vet-visits/${v.id}?lang=${lang}">${t(lang, "details")}</a></div>`).join("")}</div>`;
}

function renderVaccines(publicId: string, vaccines: VaccineEntry[], lang: LanguageCode): string {
  const list = vaccines.length === 0 ? `<p class="muted">${t(lang, "noMatches")}</p>` : `<div class="grid">${vaccines.map(v => `<div class="record"><strong>${escapeHtml(v.vaccine_name)}</strong><p class="muted">${dateOrEmpty(v.date_given)}</p>${v.sticker_photo_r2_key ? `<img class="sticker" src="/media/cats/${publicId}/vaccines/${v.id}/sticker-photo" alt="Vaccine sticker photo" />` : ""}<form class="sticker-form" action="/api/cats/${publicId}/vaccines/${v.id}/sticker-photo"><div class="photo-picker"><div class="photo-picker-actions"><label class="photo-action" for="sticker-capture-${v.id}">${t(lang, "takePhoto")}</label><label class="photo-action" for="sticker-upload-${v.id}">${t(lang, "chooseExistingPhoto")}</label></div><input class="photo-input-visually-hidden" id="sticker-capture-${v.id}" type="file" name="photoCapture" accept="image/*" capture="environment" data-photo-status="sticker-status-${v.id}" /><input class="photo-input-visually-hidden" id="sticker-upload-${v.id}" type="file" name="photoUpload" accept="image/*" data-photo-status="sticker-status-${v.id}" /><div id="sticker-status-${v.id}" class="photo-status">${t(lang, "noPhotoSelected")}</div></div><button class="btn secondary" type="submit">${t(lang, "photoUpload")}</button></form></div>`).join("")}</div>`;
  return `<h2>Vaccines</h2>${list}`;
}

function renderMedications(medications: MedicationEntry[], lang: LanguageCode): string {
  if (medications.length === 0) return `<h2>${t(lang, "medicationRecord")}</h2><p class="muted">${t(lang, "noMatches")}</p>`;
  return `<h2>${t(lang, "medicationRecord")}</h2><div class="grid">${medications.map(m => `<div class="record"><strong>${escapeHtml(m.medication_name)}</strong><p class="muted">${dateOrEmpty(m.start_date)}</p>${m.dose ? `<p>Dose recorded: ${escapeHtml(m.dose)}</p>` : ""}${m.duration ? `<p>Duration: ${escapeHtml(m.duration)}</p>` : ""}${m.prescriber_name ? `<p>Prescriber: ${escapeHtml(m.prescriber_name)}</p>` : ""}${m.notes ? `<p class="notes">${escapeHtml(m.notes)}</p>` : ""}</div>`).join("")}</div>`;
}

function renderForms(publicId: string, lang: LanguageCode): string {
  return `<h2>Add Vaccine</h2><form id="vaccine-form"><label>Vaccine name<input name="vaccine_name" required maxlength="100" /></label><label>Date given<input name="date_given" type="date" /></label><button class="btn" type="submit">${t(lang, "save")}</button></form>
  <h2>${t(lang, "medicationRecord")}</h2><form id="medication-form"><label>Medication name<input name="medication_name" required maxlength="100" /></label><label>Dose as recorded<input name="dose" maxlength="100" /></label><label>Duration<input name="duration" maxlength="100" /></label><label>Start date<input name="start_date" type="date" /></label><label>Prescriber<input name="prescriber_name" maxlength="100" /></label><label>Notes<textarea name="notes" maxlength="500"></textarea></label><button class="btn" type="submit">${t(lang, "save")}</button></form>`;
}
