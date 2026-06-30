import { validateId } from "@mishipass/shared-validation";
import { getCatPublicProfile, listSightingReportsForOwner } from "../db/index.js";
import { escapeHtml, htmlResponse } from "../utils/html.js";
import type { RequestContext } from "../middleware/session.js";

export async function handleSightingInbox(
  publicId: string,
  db: D1Database,
  ctx: RequestContext,
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response(null, { status: 302, headers: { Location: "/dashboard" } });
  }

  if (!validateId(publicId)) {
    return new Response("Not Found", { status: 404 });
  }

  const cat = await getCatPublicProfile(db, publicId);
  if (!cat) {
    return new Response("Not Found", { status: 404 });
  }

  const reports = await listSightingReportsForOwner(db, publicId, ctx.ownerId);

  const safeName = escapeHtml(cat.name);
  const safeId = escapeHtml(publicId);

  let reportsHtml: string;
  if (reports.length === 0) {
    reportsHtml = `<p>No sighting reports yet.</p>`;
  } else {
    reportsHtml = reports.map(r => {
      const safeLocation = r.location_text ? escapeHtml(r.location_text) : "Unknown location";
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
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sighting Reports — ${safeName} — MishiPass</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:2rem auto;padding:0 1rem;color:#111;line-height:1.5}
    .nav{margin-bottom:1.5rem;font-size:0.875rem}
    h1{font-size:1.5rem;margin-bottom:1rem}
    .report-card{border:1px solid #ddd;border-radius:6px;padding:0.75rem;margin-bottom:0.75rem}
    .report-location{font-weight:500;margin:0 0 0.25rem 0}
    .report-message{margin:0.25rem 0;color:#333}
    .report-date{margin:0.25rem 0 0 0;font-size:0.8rem;color:#888}
  </style>
</head>
<body>
  <div class="nav"><a href="/dashboard/cats/${safeId}">&larr; Back to ${safeName}</a></div>
  <h1>Sighting Reports for ${safeName}</h1>
  ${reportsHtml}
</body>
</html>`;

  return htmlResponse(html);
}
