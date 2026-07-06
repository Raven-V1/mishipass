import {
  getCatForOwner,
  getVetVisitForOwner,
  listMedications,
  listVaccines,
  listVetVisits,
} from "../db/index.js";
import type { MedicationEntry, VaccineEntry, VetVisitEntry } from "../db/index.js";
import type { RequestContext } from "../middleware/session.js";
import { MISHIPASS_DESIGN_CSS, escapeHtml, htmlResponse } from "../utils/html.js";
import { type LanguageCode, t } from "../utils/i18n.js";
import { renderTopNav, TOP_NAV_CSS } from "./partials/topNav.js";
import { ILLUSTRATION_VET_CAT_SRC } from "../utils/designAssets.js";

function redirectDashboard(): Response {
  return new Response(null, { status: 302, headers: { Location: "/dashboard" } });
}

function dateOrEmpty(value: string | null, lang: LanguageCode): string {
  return value ? escapeHtml(value) : t(lang, "notRecorded");
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
  const isEmpty = vetVisits.length === 0 && vaccines.length === 0 && medications.length === 0;

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeName} — ${t(lang, "cartilla")}</title>
  <style>
    ${MISHIPASS_DESIGN_CSS}
    ${TOP_NAV_CSS}
    body{padding:var(--space-3)}
    .page-shell{max-width:1184px;margin:var(--space-3) auto;padding-bottom:var(--space-6)}
    .cartilla-shell{padding:var(--space-4);margin-top:var(--space-2)}
    h1{font-size:clamp(2.25rem,6vw,3.5rem);line-height:1.02;margin:0 0 var(--space-1);color:var(--teal)}
    h2{font-size:1.5rem;margin:0;color:var(--teal)}
    h3{font-size:1.125rem;color:var(--teal);margin:0 0 var(--space-1)}
    .nav{font-size:0.875rem;margin-bottom:var(--space-3)}
    .intro-copy{margin:0 0 var(--space-4);color:var(--muted);font-weight:700}
    .split-section{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:var(--space-3);align-items:start;margin-top:var(--space-4)}
    .panel-card,.record{border:1px solid var(--line);border-radius:8px;padding:var(--space-3);background:#fff;box-shadow:0 10px 24px rgba(56,38,26,.06)}
    .panel-card{display:grid;gap:var(--space-2)}
    .panel-heading{display:flex;align-items:center;gap:var(--space-1);margin-bottom:var(--space-2)}
    .panel-subcopy{margin:0;color:var(--muted);font-weight:700;font-size:.9rem}
    .timeline{display:grid;gap:var(--space-2)}
    .timeline .record{position:relative;padding-left:var(--space-3)}
    .timeline .record:before{content:"";position:absolute;left:10px;top:22px;bottom:-22px;width:2px;background:#d9efe9}
    .timeline .record:last-child:before{display:none}
    .timeline .record:after{content:"";position:absolute;left:3px;top:18px;width:14px;height:14px;border-radius:50%;background:#fff;border:2px solid #9ad7cb}
    .timeline .record strong{display:block;color:var(--teal);margin-bottom:4px}
    .history-card{display:grid;grid-template-columns:auto 1fr auto;gap:var(--space-2);align-items:start;padding-left:var(--space-2)}
    .history-icon{width:56px;height:56px;border-radius:50%;background:#eef8f5;display:flex;align-items:center;justify-content:center;color:var(--teal);font-size:1.5rem;font-weight:900}
    .history-meta{display:grid;gap:4px}
    .history-meta p{margin:0;color:var(--muted);font-size:.9rem}
    .history-chevron{font-size:1.5rem;color:var(--muted);align-self:center}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(224px,1fr));gap:var(--space-2)}
    .notes{white-space:pre-wrap}
    label{margin-top:var(--space-2)}
    .field-row{display:flex;gap:var(--space-2);align-items:center;flex-wrap:wrap}
    .form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-2)}
    .field{display:grid;gap:var(--space-1)}
    .field-wide{grid-column:1/-1}
    .form-actions{display:flex;gap:var(--space-2);margin-top:var(--space-2);flex-wrap:wrap}
    .form-actions .mp-btn{flex:1 1 180px}
    .save-btn{background:var(--green);border-color:var(--green)}
    .form-note{margin:0;color:var(--muted);font-size:.875rem;font-weight:700}
    .collapsible-form{border:1px solid var(--line);border-radius:8px;padding:var(--space-2);margin:var(--space-2) 0;background:#fff}
    .collapsible-form summary{font-size:1.1rem;font-weight:800;color:var(--teal);cursor:pointer;list-style:none;display:flex;align-items:center;gap:var(--space-1)}
    .collapsible-form summary::-webkit-details-marker{display:none}
    .collapsible-form summary::before{content:"+";display:inline-block;width:1.2em;transition:transform .2s;color:var(--brand-coral)}
    .collapsible-form[open] summary::before{content:"−"}
    .collapsible-form form{margin-top:var(--space-2)}
    .btn{margin-top:var(--space-2)}
    .sticker{display:block;width:160px;height:112px;object-fit:cover;margin-top:var(--space-2);border-radius:8px}
    .photo-picker{margin:var(--space-1) 0 var(--space-2)}.photo-picker-actions{display:flex;gap:var(--space-1);flex-wrap:wrap}.photo-action{flex:1 1 160px}.photo-input-visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}.photo-status{margin-top:var(--space-1);overflow-wrap:anywhere}
    .empty-state{text-align:center;padding:var(--space-2) 0 var(--space-4)}
    .empty-state img{display:block;width:min(100%,420px);margin:0 auto var(--space-3)}
    .empty-state h2{font-size:clamp(2rem,5vw,3rem);line-height:1.05;margin:0 0 var(--space-1)}
    .empty-state p{max-width:420px;margin:0 auto;color:var(--muted);font-weight:700;font-size:1.05rem}
    .empty-actions{display:flex;justify-content:center;gap:var(--space-2);flex-wrap:wrap;margin-top:var(--space-4)}
    .empty-actions .mp-btn{min-width:180px}
    .well-note{display:flex;align-items:center;justify-content:center;gap:var(--space-1);margin-top:var(--space-4);padding:var(--space-2);border-radius:999px;background:#eef8f5;color:var(--teal);font-size:.875rem;font-weight:800}
    @media(max-width:860px){.split-section,.form-grid{grid-template-columns:1fr}}
    @media(max-width:430px){body{padding:var(--space-2)}.page-shell{margin:var(--space-2) auto}.cartilla-shell{padding:var(--space-3)}.grid{grid-template-columns:1fr}.photo-action,.btn,.empty-actions .mp-btn{width:100%;flex-basis:100%}.form-actions .mp-btn{flex-basis:100%}}
  </style>
</head>
<body>
  <main class="page-shell">
    ${renderTopNav(lang, { authenticated: true })}
  <section class="mp-card cartilla-shell">
    <div class="nav"><a class="mp-back" href="/dashboard/cats/${safeId}?lang=${lang}">&larr; ${safeName}</a></div>
    <h1>${t(lang, "cartilla")}</h1>
    <p class="intro-copy">${safeName} ${t(lang, "cartillaPrivateRecords")}</p>
    ${isEmpty ? `<section class="empty-state">
      <img src="${ILLUSTRATION_VET_CAT_SRC}" alt="" />
      <h2>${t(lang, "noMedicalRecordsTitle")}</h2>
      <p>${t(lang, "noMedicalRecordsSubtitle")}</p>
      <div class="empty-actions">
        <a class="mp-btn mp-btn-secondary" href="#vaccine-form">${t(lang, "addVaccine")}</a>
        <a class="mp-btn mp-btn-secondary" href="/dashboard/cats/${safeId}?lang=${lang}">${t(lang, "addVetVisit")}</a>
      </div>
    </section>` : ""}
    ${renderVetVisits(safeId, vetVisits, lang)}
    ${renderVaccines(safeId, vaccines, cat.next_vaccine_date, lang)}
    ${renderMedications(medications, lang)}
    ${renderForms(safeId, lang)}
    <div class="well-note">${t(lang, "medicalWellNote")}</div>
  </section>
  </main>
  <script>
    (function(){
      function postJson(url, payload){ return fetch(url,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}); }
      var vaccineForm=document.getElementById("vaccine-form");
      vaccineForm.addEventListener("submit",function(e){e.preventDefault();var f=e.target;postJson("/api/cats/${safeId}/vaccines",{vaccine_name:f.vaccine_name.value,date_given:f.date_given.value}).then(function(r){if(r.ok)location.reload();else r.text().then(alert);});});
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
<style>${MISHIPASS_DESIGN_CSS}${TOP_NAV_CSS}body{padding:var(--space-3)}.page-shell{max-width:672px;margin:var(--space-4) auto}.detail-shell{padding:var(--space-4);margin-top:var(--space-3)}.nav{font-size:0.875rem;margin-bottom:var(--space-3)}h1{color:var(--teal)}.field{margin:var(--space-2) 0}.label{font-size:0.875rem;color:var(--muted);font-weight:800}.value{white-space:pre-wrap}@media(max-width:430px){body{padding:var(--space-2)}.detail-shell{padding:var(--space-3)}}</style></head>
<body>
  <main class="page-shell">
    ${renderTopNav(lang, { authenticated: true })}
  <section class="mp-card detail-shell">
    <div class="nav"><a class="mp-back" href="/dashboard/cats/${safeId}/cartilla?lang=${lang}">&larr; ${t(lang, "cartilla")}</a></div>
    <h1>${t(lang, "vetVisit")}</h1>
    <div class="field"><div class="label">${t(lang, "visitDate")}</div><div class="value">${dateOrEmpty(visit.visit_date, lang)}</div></div>
    <div class="field"><div class="label">${t(lang, "vetOrClinic")}</div><div class="value">${visit.vet_or_clinic_name ? escapeHtml(visit.vet_or_clinic_name) : t(lang, "notRecorded")}</div></div>
    <div class="field"><div class="label">${t(lang, "notes")}</div><div class="value">${visit.notes ? escapeHtml(visit.notes) : t(lang, "notRecorded")}</div></div>
    <div class="field"><div class="label">${t(lang, "createdLabel")}</div><div class="value">${escapeHtml(visit.created_at)}</div></div>
  </section>
  </main>
</body></html>`;
  return htmlResponse(html);
}

function renderVetVisits(publicId: string, visits: VetVisitEntry[], lang: LanguageCode): string {
  if (visits.length === 0) {
    return `<section class="split-section"><div class="panel-card"><div class="panel-heading"><h2>${t(lang, "currentVisitStatus")}</h2></div><p class="muted">${t(lang, "noVetVisitsYet")}</p><p class="panel-subcopy">${t(lang, "noVetVisitsSummary")}</p><a class="mp-btn mp-btn-primary" href="/dashboard/cats/${publicId}?lang=${lang}">${t(lang, "addVetVisit")}</a></div><div></div></section>`;
  }
  return `<section class="split-section"><div class="panel-card"><div class="panel-heading"><h2>${t(lang, "currentVisitStatus")}</h2></div><p class="panel-subcopy">${t(lang, "visitSavedTitle")}</p><a class="mp-btn mp-btn-primary" href="/dashboard/cats/${publicId}?lang=${lang}">${t(lang, "addVetVisit")}</a></div><div class="timeline">${visits.map(v => `<div class="record"><strong>${dateOrEmpty(v.visit_date, lang)}</strong><p>${v.vet_or_clinic_name ? escapeHtml(v.vet_or_clinic_name) : t(lang, "unknown")}</p><a class="btn secondary" href="/dashboard/cats/${publicId}/cartilla/vet-visits/${v.id}?lang=${lang}">${t(lang, "details")}</a></div>`).join("")}</div></section>`;
}

function renderVaccines(publicId: string, vaccines: VaccineEntry[], _nextVaccineDate: string | null, lang: LanguageCode): string {
  const history = vaccines.length === 0
    ? `<p class="muted">${t(lang, "noMatches")}</p>`
    : `<div class="timeline">${vaccines.map(v => `<div class="record history-card"><div class="history-icon">+</div><div class="history-meta"><strong>${escapeHtml(v.vaccine_name)}</strong><p>${t(lang, "dateGiven")}: ${dateOrEmpty(v.date_given, lang)}</p><p>${t(lang, "nextDue")}: ${t(lang, "unknown")}</p>${v.sticker_photo_r2_key ? `<img class="sticker" src="/media/cats/${publicId}/vaccines/${v.id}/sticker-photo" alt="${t(lang, "vaccineSticker")}" />` : ""}<form class="sticker-form" action="/api/cats/${publicId}/vaccines/${v.id}/sticker-photo"><div class="photo-picker"><div class="photo-picker-actions"><label class="photo-action" for="sticker-capture-${v.id}">${t(lang, "takePhoto")}</label><label class="photo-action" for="sticker-upload-${v.id}">${t(lang, "chooseExistingPhoto")}</label></div><input class="photo-input-visually-hidden" id="sticker-capture-${v.id}" type="file" name="photoCapture" accept="image/*" capture="environment" data-photo-status="sticker-status-${v.id}" /><input class="photo-input-visually-hidden" id="sticker-upload-${v.id}" type="file" name="photoUpload" accept="image/*" data-photo-status="sticker-status-${v.id}" /><div id="sticker-status-${v.id}" class="photo-status">${t(lang, "noPhotoSelected")}</div></div><button class="btn secondary" type="submit">${t(lang, "photoUpload")}</button></form></div><div class="history-chevron">›</div></div>`).join("")}</div>`;
  return `<section class="split-section">
    <div class="panel-card">
      <div class="panel-heading"><h2>${t(lang, "addNewVaccine")}</h2></div>
      <form id="vaccine-form">
        <div class="form-grid">
          <label class="field">${t(lang, "vaccineName")}<input name="vaccine_name" required maxlength="100" /></label>
          <label class="field">${t(lang, "dateGiven")}<input name="date_given" type="date" /></label>
        </div>
        <p class="form-note">Save the vaccine entry first, then upload the sticker photo from that vaccine's history card.</p>
        <div class="form-actions">
          <a class="mp-btn mp-btn-secondary" href="/dashboard/cats/${publicId}?lang=${lang}">${t(lang, "cancel")}</a>
          <button class="mp-btn mp-btn-primary save-btn" type="submit">${t(lang, "saveVaccine")}</button>
        </div>
      </form>
    </div>
    <div class="panel-card">
      <div class="panel-heading"><h2>${t(lang, "vaccineHistory")}</h2></div>
      <p class="panel-subcopy">${t(lang, "vaccines")}</p>
      ${history}
    </div>
  </section>`;
}

function renderMedications(medications: MedicationEntry[], lang: LanguageCode): string {
  if (medications.length === 0) return `<h2>${t(lang, "medicationRecord")}</h2><p class="muted">${t(lang, "noMatches")}</p>`;
  return `<h2>${t(lang, "medicationRecord")}</h2><div class="grid">${medications.map(m => `<div class="record"><strong>${escapeHtml(m.medication_name)}</strong><p class="muted">${dateOrEmpty(m.start_date, lang)}</p>${m.dose ? `<p>${t(lang, "doseRecorded")}: ${escapeHtml(m.dose)}</p>` : ""}${m.duration ? `<p>${t(lang, "duration")}: ${escapeHtml(m.duration)}</p>` : ""}${m.prescriber_name ? `<p>${t(lang, "prescriber")}: ${escapeHtml(m.prescriber_name)}</p>` : ""}${m.notes ? `<p class="notes">${escapeHtml(m.notes)}</p>` : ""}</div>`).join("")}</div>`;
}

function renderForms(publicId: string, lang: LanguageCode): string {
  return `<details class="collapsible-form"><summary>${t(lang, "medicationRecord")}</summary><form id="medication-form"><label>${t(lang, "medicationName")}<input name="medication_name" required maxlength="100" /></label><label>${t(lang, "doseAsRecorded")}<input name="dose" maxlength="100" /></label><label>${t(lang, "duration")}<input name="duration" maxlength="100" /></label><label>${t(lang, "startDate")}<input name="start_date" type="date" /></label><label>${t(lang, "prescriber")}<input name="prescriber_name" maxlength="100" /></label><label>${t(lang, "notes")}<textarea name="notes" maxlength="500"></textarea></label><button class="btn" type="submit">${t(lang, "save")}</button></form></details>`;
}
