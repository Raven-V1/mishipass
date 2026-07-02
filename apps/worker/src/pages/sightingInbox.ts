import { getCatForOwner, listSightingReportsForOwner } from "../db/index.js";
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
      return `<div class="report-card">
        <p class="report-location">${safeLocation}</p>
        ${safeMessage ? `<p class="report-message">${safeMessage}</p>` : ""}
        <p class="report-date">${safeDate}</p>
      </div>`;
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
    .report-card{border:1px solid var(--line);border-radius:8px;padding:var(--space-2);margin-bottom:var(--space-2);background:#fff}
    .report-location{font-weight:800;margin:0 0 var(--space-1);color:var(--teal)}
    .report-message{margin:var(--space-1) 0;color:var(--ink);white-space:pre-wrap}
    .report-date{margin:var(--space-1) 0 0;font-size:0.875rem;color:var(--muted)}
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
