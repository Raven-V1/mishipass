import { getCatForOwner, getSightingReportForOwner, listSightingReportsForOwner } from "../db/index.js";
import { MISHIPASS_DESIGN_CSS, escapeHtml, htmlResponse } from "../utils/html.js";
import type { RequestContext } from "../middleware/session.js";
import { type LanguageCode, t } from "../utils/i18n.js";
import { renderTopNav, TOP_NAV_CSS } from "./partials/topNav.js";
import { ILLUSTRATION_MISSING_EMPTY_SRC } from "../utils/designAssets.js";

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
  const catPhoto = cat.photo_r2_key
    ? `<img class="report-thumb" src="/media/cats/${safeId}/photo" alt="${safeName}" />`
    : `<div class="report-thumb report-thumb-placeholder">${t(lang, "noPhoto")}</div>`;

  let reportsHtml: string;
  if (reports.length === 0) {
    reportsHtml = `<section class="empty-state">
      <img src="${ILLUSTRATION_MISSING_EMPTY_SRC}" alt="" />
      <h2>No Sightings Yet</h2>
      <p>Reports will appear here when someone spots your cat.</p>
      <a class="mp-btn mp-btn-primary empty-cta" href="/dashboard/cats/${safeId}/missing-card?lang=${lang}">Share Missing Poster</a>
    </section>`;
  } else {
    reportsHtml = reports.map(r => {
      const safeLocation = r.location_text ? escapeHtml(r.location_text) : t(lang, "unknown");
      const safeMessage = r.message ? escapeHtml(r.message) : "";
      const safeDate = r.created_at ? escapeHtml(r.created_at) : "";
      const reportLink = `/dashboard/cats/${safeId}/sightings/${encodeURIComponent(r.created_at || "")}?lang=${lang}`;
      return `<article class="report-card">
        <div>${catPhoto}</div>
        <div class="report-main">
          <span class="report-badge">${t(lang, "reports")}</span>
          <p class="report-location">${safeLocation}</p>
          <p class="report-sub">${safeName}</p>
          <p class="report-date">${safeDate}</p>
        </div>
        <div class="report-reporter">
          <div class="reporter-icon">○</div>
          <div>
            <strong>Reporter</strong>
            <p>Anonymous</p>
            ${safeMessage ? `<p class="report-message">${safeMessage}</p>` : `<p class="report-message">${t(lang, "reportSighting")}</p>`}
          </div>
        </div>
        <div class="report-actions">
          <a class="mp-btn mp-btn-primary" href="${reportLink}">View</a>
          <span class="mp-btn mp-btn-secondary report-reviewed">Reviewed</span>
        </div>
      </article>`;
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
    ${TOP_NAV_CSS}
    body{padding:var(--space-3)}
    .page-shell{max-width:1184px;margin:0 auto;padding-bottom:var(--space-6)}.inbox-shell{padding:var(--space-4);margin-top:var(--space-2)}
    .nav{margin-bottom:var(--space-3);font-size:0.875rem}
    h1{font-size:clamp(2.25rem,6vw,3.5rem);line-height:1.02;margin:0 0 var(--space-1);color:var(--teal)}
    .page-sub{margin:0 0 var(--space-4);color:var(--muted);font-weight:700}
    .sort-row{display:flex;justify-content:flex-end;gap:var(--space-2);margin:0 0 var(--space-3);flex-wrap:wrap}
    .sort-pill{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 var(--space-3);border-radius:12px;border:1px solid var(--line);background:rgba(255,253,249,.96);font-weight:800;color:var(--ink)}
    .sort-pill.is-active{background:#fff0e9;color:var(--brand-coral)}
    .report-list{display:grid;gap:var(--space-2)}
    .report-card{display:grid;grid-template-columns:168px minmax(0,1fr) minmax(0,1fr) 172px;gap:var(--space-3);align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:18px;padding:var(--space-2);background:#fff;box-shadow:0 10px 24px rgba(56,38,26,.06)}
    .report-thumb{width:100%;height:120px;object-fit:cover;border-radius:14px;background:#fff7f0}
    .report-thumb-placeholder{display:flex;align-items:center;justify-content:center;color:var(--muted);font-weight:800}
    .report-main{display:grid;gap:8px}
    .report-badge{display:inline-flex;align-items:center;gap:6px;min-height:28px;padding:0 12px;border-radius:999px;background:#fff0e9;color:var(--brand-coral);font-size:.75rem;font-weight:900;width:max-content}
    .report-location{font-weight:900;margin:0 0 .35rem;color:var(--teal);font-size:1.1rem}
    .report-sub{margin:0;color:var(--ink);font-weight:800}
    .report-message{margin:0;color:var(--ink);white-space:pre-wrap;font-size:.9375rem}
    .report-date{margin:0;font-size:0.875rem;color:var(--muted);font-weight:700}
    .report-reporter{display:grid;grid-template-columns:auto minmax(0,1fr);gap:var(--space-2);align-items:start}
    .reporter-icon{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#fff7f0;border:1px solid var(--line);color:var(--muted);font-weight:900}
    .report-reporter strong{display:block;color:var(--ink);margin-bottom:4px}
    .report-reporter p{margin:0 0 6px;color:var(--muted);font-weight:700}
    .report-actions{display:grid;gap:var(--space-2)}
    .report-actions .mp-btn{width:100%}
    .report-reviewed{justify-content:center}
    .empty-state{text-align:center;padding:var(--space-3) 0}
    .empty-state img{display:block;width:min(100%,430px);margin:0 auto var(--space-3)}
    .empty-state h2{margin:0 0 var(--space-1);font-size:clamp(2rem,5vw,3rem);line-height:1.05;color:var(--teal)}
    .empty-state p{max-width:420px;margin:0 auto;color:var(--muted);font-weight:700;font-size:1.05rem}
    .empty-cta{margin-top:var(--space-4);background:var(--brand-orange);border-color:var(--brand-orange)}
    @media(max-width:980px){.report-card{grid-template-columns:132px 1fr}.report-reporter,.report-actions{grid-column:1/-1}.sort-row{justify-content:flex-start}}
    @media(max-width:430px){body{padding:var(--space-2)}.inbox-shell{padding:var(--space-3)}.report-card{grid-template-columns:1fr}.sort-pill{width:100%}}
  </style>
</head>
<body>
  <main class="page-shell">
    ${renderTopNav(lang, { authenticated: true, active: "dashboard" })}
  <section class="mp-card inbox-shell">
    <div class="nav"><a class="mp-back" href="/dashboard/cats/${safeId}?lang=${lang}">&larr; ${safeName}</a></div>
    <h1>${t(lang, "reports")}</h1>
    <p class="page-sub">${safeName}</p>
    <div class="sort-row"><span class="sort-pill is-active">Newest</span><span class="sort-pill">Nearest</span><span class="sort-pill">Unread</span></div>
    <div class="report-list">${reportsHtml}</div>
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
    ${TOP_NAV_CSS}
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
    ${renderTopNav(lang, { authenticated: true, active: "dashboard" })}
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
