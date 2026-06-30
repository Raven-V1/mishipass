import { validateId } from "@mishipass/shared-validation";
import { getCatForOwner } from "../db/index.js";
import type { CatOwnerView } from "../db/index.js";
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
  const publicUrl = `${publicBaseUrl}/c/${safeId}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeName} — MishiPass Dashboard</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:2rem auto;padding:0 1rem;color:#111;line-height:1.5}
    h1{font-size:1.5rem;margin-bottom:0.5rem}
    .meta{font-size:0.875rem;color:#555;margin-bottom:0.5rem}
    .nav{margin-bottom:1.5rem;font-size:0.875rem}
    .links{margin-top:1rem}
    .links a{display:inline-block;padding:0.5rem 1rem;margin:0.25rem 0.25rem 0.25rem 0;background:#111;color:#fff;text-decoration:none;border-radius:4px;font-size:0.875rem}
    .links a.secondary{background:#eee;color:#111}
    .mode-badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:0.8rem;font-weight:bold}
    .mode-active{background:#dfd;color:#060}
    .mode-missing{background:#fdd;color:#900}
    .url-box{background:#f5f5f5;padding:0.5rem;border-radius:4px;font-size:0.8rem;word-break:break-all;margin:0.5rem 0}
  </style>
</head>
<body>
  <div class="nav"><a href="/dashboard">&larr; Dashboard</a></div>
  <h1>${safeName}</h1>
  <p class="meta">Country: ${safeCountry} | Mode: <span class="mode-badge mode-${safeMode}">${safeMode}</span></p>
  <div class="url-box">${escapeHtml(publicUrl)}</div>
  <div class="links">
    <a href="/c/${safeId}" class="secondary">View Public Profile</a>
    <a href="/dashboard/cats/${safeId}/qr" class="secondary">QR Card</a>
    <a href="/dashboard/cats/${safeId}/sightings" class="secondary">Sighting Reports</a>
  </div>
</body>
</html>`;

  return htmlResponse(html);
}
