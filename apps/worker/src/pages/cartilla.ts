import { validateId } from "@mishipass/shared-validation";
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
): Promise<Response> {
  if (ctx.ownerId === null) return redirectDashboard();
  if (!validateId(publicId)) return new Response("Not Found", { status: 404 });
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
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeName} — Digital Cartilla</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;max-width:760px;margin:2rem auto;padding:0 1rem;color:#111;line-height:1.5}
    h1{font-size:1.5rem;margin-bottom:0.25rem}
    h2{font-size:1.1rem;margin-top:1.5rem;border-bottom:1px solid #eee;padding-bottom:0.25rem}
    a{color:#111}.nav{font-size:0.875rem;margin-bottom:1.5rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:0.75rem}
    .record{border:1px solid #ddd;border-radius:6px;padding:0.75rem}.muted{color:#666;font-size:0.875rem}.notes{white-space:pre-wrap}
    label{display:block;margin-top:0.6rem;font-size:0.875rem;font-weight:600}input,textarea{width:100%;padding:0.5rem;border:1px solid #ccc;border-radius:4px;box-sizing:border-box}
    textarea{min-height:70px}.btn{display:inline-block;background:#111;color:#fff;border:0;border-radius:4px;padding:0.5rem 0.85rem;margin-top:0.75rem;text-decoration:none;cursor:pointer}
    .secondary{background:#eee;color:#111}.sticker{display:block;max-width:140px;max-height:100px;object-fit:cover;margin-top:0.5rem;border-radius:4px}
  </style>
</head>
<body>
  <div class="nav"><a href="/dashboard/cats/${safeId}">&larr; Back to ${safeName}</a></div>
  <h1>Digital Cartilla</h1>
  <p class="muted">${safeName} private owner records.</p>
  ${renderVetVisits(safeId, vetVisits)}
  ${renderVaccines(safeId, vaccines)}
  ${renderMedications(medications)}
  ${renderForms(safeId)}
  <script>
    (function(){
      function postJson(url, payload){ return fetch(url,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}); }
      var vaccineForm=document.getElementById("vaccine-form");
      vaccineForm.addEventListener("submit",function(e){e.preventDefault();var f=e.target;postJson("/api/cats/${safeId}/vaccines",{vaccine_name:f.vaccine_name.value,date_given:f.date_given.value}).then(function(r){if(r.ok) location.reload(); else r.text().then(alert);});});
      var medForm=document.getElementById("medication-form");
      medForm.addEventListener("submit",function(e){e.preventDefault();var f=e.target;postJson("/api/cats/${safeId}/medications",{medication_name:f.medication_name.value,dose:f.dose.value,duration:f.duration.value,start_date:f.start_date.value,prescriber_name:f.prescriber_name.value,notes:f.notes.value}).then(function(r){if(r.ok) location.reload(); else r.text().then(alert);});});
      var stickerForms=document.querySelectorAll(".sticker-form");
      for(var i=0;i<stickerForms.length;i++) stickerForms[i].addEventListener("submit",function(e){e.preventDefault();var f=e.target;var fd=new FormData();if(!f.photo.files[0])return;fd.append("photo",f.photo.files[0]);fetch(f.action,{method:"POST",credentials:"same-origin",body:fd}).then(function(r){if(r.ok) location.reload(); else r.text().then(alert);});});
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
): Promise<Response> {
  if (ctx.ownerId === null) return redirectDashboard();
  if (!validateId(publicId)) return new Response("Not Found", { status: 404 });
  const visitId = Number.parseInt(visitIdRaw, 10);
  if (!Number.isSafeInteger(visitId) || visitId <= 0) return new Response("Not Found", { status: 404 });
  const cat = await getCatForOwner(db, publicId, ctx.ownerId);
  if (!cat) return new Response("Not Found", { status: 404 });
  const visit = await getVetVisitForOwner(db, publicId, ctx.ownerId, visitId);
  if (!visit) return new Response("Not Found", { status: 404 });

  const safeId = escapeHtml(publicId);
  const safeName = escapeHtml(cat.name);
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Vet Visit Detail — ${safeName}</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;max-width:620px;margin:2rem auto;padding:0 1rem;color:#111;line-height:1.5}.nav{font-size:0.875rem;margin-bottom:1.5rem}.field{margin:0.75rem 0}.label{font-size:0.8rem;color:#666;font-weight:600}.value{white-space:pre-wrap}</style></head>
<body>
  <div class="nav"><a href="/dashboard/cats/${safeId}/cartilla">&larr; Digital Cartilla</a></div>
  <h1>Vet Visit Detail</h1>
  <div class="field"><div class="label">Visit date</div><div class="value">${dateOrEmpty(visit.visit_date)}</div></div>
  <div class="field"><div class="label">Vet or clinic</div><div class="value">${visit.vet_or_clinic_name ? escapeHtml(visit.vet_or_clinic_name) : "Not recorded"}</div></div>
  <div class="field"><div class="label">Notes</div><div class="value">${visit.notes ? escapeHtml(visit.notes) : "Not recorded"}</div></div>
  <div class="field"><div class="label">Created</div><div class="value">${escapeHtml(visit.created_at)}</div></div>
</body></html>`;
  return htmlResponse(html);
}

function renderVetVisits(publicId: string, visits: VetVisitEntry[]): string {
  if (visits.length === 0) return `<h2>Vet Visits</h2><p class="muted">No vet visit records yet.</p>`;
  return `<h2>Vet Visits</h2><div class="grid">${visits.map(v => `<div class="record"><strong>${dateOrEmpty(v.visit_date)}</strong><p>${v.vet_or_clinic_name ? escapeHtml(v.vet_or_clinic_name) : "Clinic not recorded"}</p><a class="btn secondary" href="/dashboard/cats/${publicId}/cartilla/vet-visits/${v.id}">Open Details</a></div>`).join("")}</div>`;
}

function renderVaccines(publicId: string, vaccines: VaccineEntry[]): string {
  const list = vaccines.length === 0 ? `<p class="muted">No vaccine records yet.</p>` : `<div class="grid">${vaccines.map(v => `<div class="record"><strong>${escapeHtml(v.vaccine_name)}</strong><p class="muted">${dateOrEmpty(v.date_given)}</p>${v.sticker_photo_r2_key ? `<img class="sticker" src="/media/cats/${publicId}/vaccines/${v.id}/sticker-photo" alt="Vaccine sticker photo" />` : ""}<form class="sticker-form" action="/api/cats/${publicId}/vaccines/${v.id}/sticker-photo"><input type="file" name="photo" accept="image/jpeg,image/png,image/webp" /><button class="btn secondary" type="submit">Upload Sticker Photo</button></form></div>`).join("")}</div>`;
  return `<h2>Vaccines</h2>${list}`;
}

function renderMedications(medications: MedicationEntry[]): string {
  if (medications.length === 0) return `<h2>Medication Record</h2><p class="muted">No medication records yet.</p>`;
  return `<h2>Medication Record</h2><div class="grid">${medications.map(m => `<div class="record"><strong>${escapeHtml(m.medication_name)}</strong><p class="muted">${dateOrEmpty(m.start_date)}</p>${m.dose ? `<p>Dose recorded: ${escapeHtml(m.dose)}</p>` : ""}${m.duration ? `<p>Duration: ${escapeHtml(m.duration)}</p>` : ""}${m.prescriber_name ? `<p>Prescriber: ${escapeHtml(m.prescriber_name)}</p>` : ""}${m.notes ? `<p class="notes">${escapeHtml(m.notes)}</p>` : ""}</div>`).join("")}</div>`;
}

function renderForms(publicId: string): string {
  return `<h2>Add Vaccine</h2><form id="vaccine-form"><label>Vaccine name<input name="vaccine_name" required maxlength="100" /></label><label>Date given<input name="date_given" type="date" /></label><button class="btn" type="submit">Save Vaccine</button></form>
  <h2>Add Medication Record</h2><form id="medication-form"><label>Medication name<input name="medication_name" required maxlength="100" /></label><label>Dose as recorded<input name="dose" maxlength="100" /></label><label>Duration<input name="duration" maxlength="100" /></label><label>Start date<input name="start_date" type="date" /></label><label>Prescriber<input name="prescriber_name" maxlength="100" /></label><label>Notes<textarea name="notes" maxlength="500"></textarea></label><button class="btn" type="submit">Save Medication Record</button></form>`;
}
