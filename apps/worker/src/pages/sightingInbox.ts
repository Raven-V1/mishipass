import { getCatForOwner, getSightingReportForOwner, listSightingReportsForOwner } from "../db/index.js";
import { MISHIPASS_DESIGN_CSS, brandLockupHtml, escapeHtml, htmlResponse } from "../utils/html.js";
import type { RequestContext } from "../middleware/session.js";
import { type LanguageCode, t } from "../utils/i18n.js";

export async function handleSightingInbox(
  publicId: string,
  db: D1Database,
  ctx: RequestContext,
  lang: LanguageCode = "en",
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response(null, { status: 302, headers: { Location: "/dashboard" } });
  }

  const cat = await getCatForOwner(db, publicId, ctx.ownerId);
  if (!cat) {
    return new Response("Not Found", { status: 404 });
  }

  const reports = await listSightingReportsForOwner(db, publicId, ctx.ownerId);

  const safeName = escapeHtml(cat.name);
  const safeId = escapeHtml(publicId);

  let reportsHtml: string;
  if (reports.length === 0) {
    reportsHtml = `<p>${t(lang, "noMatches")}</p>`;
  } else {
    reportsHtml = reports.map(r => {
      const safeLocation = r.location_text ? escapeHtml(r.location_text) : t(lang, "unknown");
      const safeMessage = r.message ? escapeHtml(r.message) : "";
      const safeDate = r.created_at ? escapeHtml(r.created_at) : "";
      const reportLink = `/dashboard/cats/${safeId}/sightings/${encodeURIComponent(r.created_at || "")}?lang=${lang}`;
      return `<a class="report-card" href="${reportLink}">
        <p class="report-location">${safeLocation}</p>
        ${safeMessage ? `<p class="report-message">${safeMessage}</p>` : ""}
        <p class="report-date">${safeDate}</p>
        <span class="report-link">${t(lang, "details")} &rarr;</span>
      </a>`;
    }).join("\n");
  }

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t(lang, "reports")} — ${safeName} — MishiPass</title>
  <style>
    ${MISHIPASS_DESIGN_CSS}
    body{padding:var(--space-3)}
    .page-shell{max-width:704px;margin:var(--space-4) auto}.inbox-shell{padding:var(--space-4);margin-top:var(--space-3)}
    .nav{margin-bottom:var(--space-3);font-size:0.875rem}
    h1{font-size:clamp(2rem,6vw,3rem);line-height:1.08;margin:0 0 var(--space-3);color:var(--teal)}
    .report-card{display:block;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:8px;padding:var(--space-2);margin-bottom:var(--space-2);background:#fff;transition:border-color .15s}
    .report-card:hover{border-color:var(--teal)}
    .report-location{font-weight:800;margin:0 0 var(--space-1);color:var(--teal)}
    .report-message{margin:var(--space-1) 0;color:var(--ink);white-space:pre-wrap}
    .report-date{margin:var(--space-1) 0 0;font-size:0.875rem;color:var(--muted)}
    .report-link{font-size:0.875rem;font-weight:800;color:var(--teal)}
    @media(max-width:430px){body{padding:var(--space-2)}.inbox-shell{padding:var(--space-3)}}
  </style>
</head>
<body>
  <main class="page-shell">
    ${brandLockupHtml(`/?lang=${lang}`)}
  <section class="mp-card inbox-shell">
    <div class="nav"><a class="mp-back" href="/dashboard/cats/${safeId}?lang=${lang}">&larr; ${safeName}</a></div>
    <h1>${t(lang, "reports")}: ${safeName}</h1>
    ${reportsHtml}
  </section>
  </main>
</body>
</html>`;

  return htmlResponse(html);
}

export async function handleSightingDetail(
  publicId: string,
  reportTimestamp: string,
  db: D1Database,
  photos: R2Bucket | undefined,
  ctx: RequestContext,
  lang: LanguageCode = "en",
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response(null, { status: 302, headers: { Location: "/dashboard" } });
  }

  const cat = await getCatForOwner(db, publicId, ctx.ownerId);
  if (!cat) {
    return new Response("Not Found", { status: 404 });
  }

  const decodedTimestamp = decodeURIComponent(reportTimestamp);
  const report = await getSightingReportForOwner(db, publicId, ctx.ownerId, decodedTimestamp);
  if (!report) {
    return new Response("Not Found", { status: 404 });
  }

  const safeName = escapeHtml(cat.name);
  const safeId = escapeHtml(publicId);
  const safeLocation = report.location_text ? escapeHtml(report.location_text) : t(lang, "unknown");
  const safeMessage = report.message ? escapeHtml(report.message) : "";
  const safeDate = report.created_at ? escapeHtml(report.created_at) : "";

  // Photo served through the authenticated sighting photo route
  const photoHtml = report.photo_r2_key
    ? `<div class="report-photo"><img src="/api/cats/${safeId}/sightings/${encodeURIComponent(report.created_at || "")}/photo" alt="Sighting photo" /></div>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t(lang, "reportSighting")} — ${safeName} — MishiPass</title>
  <style>
    ${MISHIPASS_DESIGN_CSS}
    body{padding:var(--space-3)}
    .page-shell{max-width:704px;margin:var(--space-4) auto}.detail-shell{padding:var(--space-4);margin-top:var(--space-3)}
    .nav{margin-bottom:var(--space-3);font-size:0.875rem}
    h1{font-size:clamp(1.5rem,5vw,2.5rem);line-height:1.08;margin:0 0 var(--space-3);color:var(--teal)}
    .field-label{font-size:0.875rem;font-weight:800;color:var(--muted);margin:0 0 var(--space-1)}
    .field-value{margin:0 0 var(--space-3);color:var(--ink);font-size:1rem;white-space:pre-wrap}
    .report-photo img{width:100%;max-width:400px;border-radius:8px;margin:var(--space-2) 0 var(--space-3)}
    @media(max-width:430px){body{padding:var(--space-2)}.detail-shell{padding:var(--space-3)}}
  </style>
</head>
<body>
  <main class="page-shell">
    ${brandLockupHtml(`/?lang=${lang}`)}
  <section class="mp-card detail-shell">
    <div class="nav"><a class="mp-back" href="/dashboard/cats/${safeId}/sightings?lang=${lang}">&larr; ${t(lang, "reports")}</a></div>
    <h1>${t(lang, "reportSighting")}: ${safeName}</h1>
    <p class="field-label">${t(lang, "lastSeen")}</p>
    <p class="field-value">${safeLocation}</p>
    ${safeMessage ? `<p class="field-label">Message</p><p class="field-value">${safeMessage}</p>` : ""}
    <p class="field-label">Date</p>
    <p class="field-value">${safeDate}</p>
    ${photoHtml}
  </section>
  </main>
</body>
</html>`;

  return htmlResponse(html);
}
