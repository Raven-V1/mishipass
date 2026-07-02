import { getCatForOwner, listVetVisits } from "../db/index.js";
import { getCountryBadgeLabel } from "../data/countries.js";
import { MISHIPASS_DESIGN_CSS, escapeHtml, htmlResponse } from "../utils/html.js";
import type { RequestContext } from "../middleware/session.js";
import { type LanguageCode, t } from "../utils/i18n.js";

type VetVisitSummary = {
  displayDate: string;
  heading: string;
  clinicOrVet: string | null;
  reason: string | null;
  weight: string | null;
  notes: string | null;
};

function summarizeVetVisit(visit: { visit_date: string | null; vet_or_clinic_name: string | null; notes: string | null }): VetVisitSummary {
  const displayDate = visit.visit_date?.trim() || "Date not recorded";
  const clinicOrVet = visit.vet_or_clinic_name?.trim() || null;
  let reason: string | null = null;
  let weight: string | null = null;
  const noteLines: string[] = [];
  for (const rawLine of (visit.notes || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.toLowerCase().startsWith("reason:")) {
      reason = line.slice("reason:".length).trim() || null;
    } else if (line.toLowerCase().startsWith("weight:")) {
      weight = line.slice("weight:".length).trim() || null;
    } else {
      noteLines.push(line);
    }
  }
  return {
    displayDate,
    heading: clinicOrVet || "Vet visit record",
    clinicOrVet,
    reason,
    weight,
    notes: noteLines.length > 0 ? noteLines.join("\n") : null,
  };
}

export async function handleCatDetail(
  publicId: string,
  db: D1Database,
  ctx: RequestContext,
  publicBaseUrl: string,
  lang: LanguageCode = "en",
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response(null, { status: 302, headers: { Location: "/dashboard" } });
  }

  const cat = await getCatForOwner(db, publicId, ctx.ownerId);
  if (!cat) {
    return new Response("Not Found", { status: 404 });
  }

  const safeName = escapeHtml(cat.name);
  const safeId = escapeHtml(publicId);
  const safeCountry = escapeHtml(getCountryBadgeLabel(cat.country_code));
  const safeMode = escapeHtml(cat.current_mode);

  // Build cat info fields
  let infoHtml = "";
  if (cat.sex) infoHtml += `<p class="info">${t(lang, "sex")}: ${escapeHtml(cat.sex)}</p>`;
  if (cat.color_markings) infoHtml += `<p class="info">${t(lang, "colorMarkings")}: ${escapeHtml(cat.color_markings)}</p>`;
  if (cat.breed_mix) infoHtml += `<p class="info">${t(lang, "breedMix")}: ${escapeHtml(cat.breed_mix)}</p>`;
  if (cat.weight) infoHtml += `<p class="info">${t(lang, "weight")}: ${escapeHtml(cat.weight)}</p>`;
  if (cat.birth_date) infoHtml += `<p class="info">Birth date: ${escapeHtml(cat.birth_date)}</p>`;
  if (cat.notes) infoHtml += `<p class="info">Notes: ${escapeHtml(cat.notes)}</p>`;

  // Photo
  const photoHtml = cat.photo_r2_key
    ? `<div class="photo"><img src="/media/cats/${safeId}/photo" alt="${safeName}" /></div>`
    : "";

  // Vet visit records (owner-only)
  const vetVisits = await listVetVisits(db, publicId, ctx.ownerId);
  let vetHtml = `<h2>${t(lang, "vetVisit")} Records</h2>`;
  if (vetVisits.length === 0) {
    vetHtml += `<p class="empty">No vet visits recorded yet.</p>`;
  } else {
    vetHtml += `<div class="vet-list">`;
    for (const v of vetVisits) {
      const summary = summarizeVetVisit(v);
      vetHtml += `<div class="vet-entry">`;
      vetHtml += `<p class="vet-date">${escapeHtml(summary.displayDate)}</p>`;
      vetHtml += `<p class="vet-title">${escapeHtml(summary.heading)}</p>`;
      if (summary.clinicOrVet) vetHtml += `<p class="vet-field"><strong>Vet or clinic:</strong> ${escapeHtml(summary.clinicOrVet)}</p>`;
      if (summary.reason) vetHtml += `<p class="vet-field"><strong>${t(lang, "reason")}:</strong> ${escapeHtml(summary.reason)}</p>`;
      if (summary.weight) vetHtml += `<p class="vet-field"><strong>${t(lang, "weight")}:</strong> ${escapeHtml(summary.weight)}</p>`;
      if (summary.notes) vetHtml += `<p class="vet-notes">${escapeHtml(summary.notes)}</p>`;
      vetHtml += `<a class="secondary detail-link" href="/dashboard/cats/${safeId}/cartilla/vet-visits/${v.id}?lang=${lang}">${t(lang, "details")}</a>`;
      vetHtml += `</div>`;
    }
    vetHtml += `</div>`;
  }

  // Links — sightings only if missing
  let linksHtml = `
    <a href="/c/${safeId}?lang=${lang}" class="secondary">${t(lang, "viewPublicProfile")}</a>
    <a href="/dashboard/cats/${safeId}/qr?lang=${lang}" class="secondary">${t(lang, "qrCard")}</a>
    <a href="/dashboard/cats/${safeId}/cartilla?lang=${lang}" class="secondary">${t(lang, "cartilla")}</a>`;
  if (cat.current_mode === "missing") {
    linksHtml += `\n    <a href="/dashboard/cats/${safeId}/sightings?lang=${lang}" class="secondary">${t(lang, "reports")}</a>`;
  }

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeName} — MishiPass Dashboard</title>
  <style>
    ${MISHIPASS_DESIGN_CSS}
    body{padding:var(--space-3)}
    .detail-shell{max-width:736px;margin:var(--space-4) auto;padding:var(--space-4)}
    h1{font-size:clamp(2rem,6vw,3rem);line-height:1.08;margin:0 0 var(--space-1);color:var(--teal)}
    h2{font-size:1.25rem;margin:var(--space-4) 0 var(--space-2);color:var(--teal);border-bottom:1px solid var(--line);padding-bottom:var(--space-1)}
    .meta{font-size:0.875rem;color:var(--muted);margin-bottom:var(--space-1)}
    .nav{margin-bottom:var(--space-3);font-size:0.875rem}
    .info{font-size:0.95rem;margin:var(--space-1) 0;color:var(--ink)}
    .photo img{width:144px;height:144px;border-radius:16px;object-fit:cover;margin:var(--space-3) 0}
    .links{display:flex;gap:var(--space-1);flex-wrap:wrap;margin-top:var(--space-3)}
    .links a{background:#fff7f0;color:var(--teal);border:1px solid var(--line);text-decoration:none;border-radius:8px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;padding:var(--space-1) var(--space-2);font-weight:800}
    .mode-active{background:#dfd;color:#060}
    .mode-missing{background:#fdd;color:#900}
    .mode-vet{background:#e0f0ff;color:#036}
    .id-line{font-size:0.8rem;color:var(--muted);margin:var(--space-1) 0;font-family:monospace}
    .vet-list{margin-top:var(--space-2)}
    .vet-entry{border:1px solid var(--line);border-radius:16px;padding:var(--space-2);margin-bottom:var(--space-2);background:#fff}
    .vet-date{font-weight:600;margin:0 0 0.25rem 0;font-size:0.9rem}
    .vet-title{margin:0 0 0.35rem 0;font-size:0.95rem;color:#111;font-weight:700}
    .vet-field{margin:0.2rem 0;font-size:0.875rem;color:#333}
    .vet-notes{margin:0.35rem 0 0;font-size:0.85rem;color:#555;white-space:pre-wrap}
    .detail-link{margin-top:var(--space-2)}
    @media(max-width:430px){body{padding:var(--space-2)}.detail-shell{padding:var(--space-3)}.links a{width:100%}}
  </style>
</head>
<body>
  <main class="mp-card detail-shell">
    <div class="nav"><a class="mp-back" href="/dashboard?lang=${lang}">&larr; ${t(lang, "dashboard")}</a></div>
    <h1>${safeName}</h1>
    <p class="meta">${safeCountry} &middot; <span class="mode-badge mode-${safeMode}">${safeMode}</span></p>
    <p class="id-line">${safeId}</p>
    ${photoHtml}
    ${infoHtml}
    <div class="links">${linksHtml}
    </div>
    ${vetHtml}
  </main>
</body>
</html>`;

  return htmlResponse(html);
}
