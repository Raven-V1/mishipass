import { validateId } from "@mishipass/shared-validation";
import { getCatForOwner, listVetVisits } from "../db/index.js";
import { getCountryName } from "../data/countries.js";
import { escapeHtml, htmlResponse } from "../utils/html.js";
import type { RequestContext } from "../middleware/session.js";

export async function handleCatDetail(
  publicId: string,
  db: D1Database,
  ctx: RequestContext,
  publicBaseUrl: string,
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response(null, { status: 302, headers: { Location: "/dashboard" } });
  }

  if (!validateId(publicId)) {
    return new Response("Not Found", { status: 404 });
  }

  const cat = await getCatForOwner(db, publicId, ctx.ownerId);
  if (!cat) {
    return new Response("Not Found", { status: 404 });
  }

  const safeName = escapeHtml(cat.name);
  const safeId = escapeHtml(publicId);
  const safeCountry = escapeHtml(getCountryName(cat.country_code));
  const safeMode = escapeHtml(cat.current_mode);

  // Build cat info fields
  let infoHtml = "";
  if (cat.sex) infoHtml += `<p class="info">Sex: ${escapeHtml(cat.sex)}</p>`;
  if (cat.color_markings) infoHtml += `<p class="info">Color / Markings: ${escapeHtml(cat.color_markings)}</p>`;
  if (cat.breed_mix) infoHtml += `<p class="info">Breed / Mix: ${escapeHtml(cat.breed_mix)}</p>`;
  if (cat.weight) infoHtml += `<p class="info">Weight: ${escapeHtml(cat.weight)}</p>`;
  if (cat.birth_date) infoHtml += `<p class="info">Birth date: ${escapeHtml(cat.birth_date)}</p>`;
  if (cat.notes) infoHtml += `<p class="info">Notes: ${escapeHtml(cat.notes)}</p>`;

  // Photo
  const photoHtml = cat.photo_r2_key
    ? `<div class="photo"><img src="/media/cats/${safeId}/photo" alt="${safeName}" /></div>`
    : "";

  // Vet visit records (owner-only)
  const vetVisits = await listVetVisits(db, publicId, ctx.ownerId);
  let vetHtml = `<h2>Vet Visit Records</h2>`;
  if (vetVisits.length === 0) {
    vetHtml += `<p class="empty">No vet visit records yet.</p>`;
  } else {
    vetHtml += `<div class="vet-list">`;
    for (const v of vetVisits) {
      vetHtml += `<div class="vet-entry">`;
      if (v.visit_date) vetHtml += `<p class="vet-date">${escapeHtml(v.visit_date)}</p>`;
      if (v.vet_or_clinic_name) vetHtml += `<p class="vet-clinic">${escapeHtml(v.vet_or_clinic_name)}</p>`;
      if (v.notes) vetHtml += `<p class="vet-notes">${escapeHtml(v.notes)}</p>`;
      vetHtml += `</div>`;
    }
    vetHtml += `</div>`;
  }

  // Links — sightings only if missing
  let linksHtml = `
    <a href="/c/${safeId}" class="secondary">View Public Profile</a>
    <a href="/dashboard/cats/${safeId}/qr" class="secondary">QR Card</a>`;
  if (cat.current_mode === "missing") {
    linksHtml += `\n    <a href="/dashboard/cats/${safeId}/sightings" class="secondary">Sighting Reports</a>`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeName} — MishiPass Dashboard</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:2rem auto;padding:0 1rem;color:#111;line-height:1.5}
    h1{font-size:1.5rem;margin-bottom:0.5rem}
    h2{font-size:1.15rem;margin-top:1.5rem;margin-bottom:0.5rem;border-bottom:1px solid #eee;padding-bottom:0.25rem}
    .meta{font-size:0.875rem;color:#555;margin-bottom:0.5rem}
    .nav{margin-bottom:1.5rem;font-size:0.875rem}
    .info{font-size:0.9rem;margin:0.25rem 0;color:#333}
    .photo img{width:100px;height:100px;border-radius:50%;object-fit:cover;margin:0.75rem 0}
    .links{margin-top:1rem}
    .links a{display:inline-block;padding:0.5rem 1rem;margin:0.25rem 0.25rem 0.25rem 0;background:#eee;color:#111;text-decoration:none;border-radius:4px;font-size:0.875rem}
    .mode-badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:0.8rem;font-weight:bold}
    .mode-active{background:#dfd;color:#060}
    .mode-missing{background:#fdd;color:#900}
    .mode-vet{background:#e0f0ff;color:#036}
    .id-line{font-size:0.8rem;color:#777;margin:0.25rem 0;font-family:monospace}
    .empty{font-size:0.875rem;color:#888}
    .vet-list{margin-top:0.5rem}
    .vet-entry{border:1px solid #eee;border-radius:4px;padding:0.75rem;margin-bottom:0.5rem}
    .vet-date{font-weight:600;margin:0 0 0.25rem 0;font-size:0.9rem}
    .vet-clinic{margin:0 0 0.25rem 0;font-size:0.875rem;color:#333}
    .vet-notes{margin:0;font-size:0.8rem;color:#555;white-space:pre-wrap}
  </style>
</head>
<body>
  <div class="nav"><a href="/dashboard">&larr; Dashboard</a></div>
  <h1>${safeName}</h1>
  <p class="meta">${safeCountry} &middot; <span class="mode-badge mode-${safeMode}">${safeMode}</span></p>
  <p class="id-line">${safeId}</p>
  ${photoHtml}
  ${infoHtml}
  <div class="links">${linksHtml}
  </div>
  ${vetHtml}
</body>
</html>`;

  return htmlResponse(html);
}
