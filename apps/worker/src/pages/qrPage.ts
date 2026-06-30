import { validateId } from "@mishipass/shared-validation";
import { getCatPublicProfile } from "../db/index.js";
import { escapeHtml, htmlResponse } from "../utils/html.js";
import type { RequestContext } from "../middleware/session.js";

export async function handleQrPage(
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

  const cat = await getCatPublicProfile(db, publicId);
  if (!cat) {
    return new Response("Not Found", { status: 404 });
  }

  const safeName = escapeHtml(cat.name);
  const safeId = escapeHtml(publicId);
  const publicUrl = `${publicBaseUrl}/c/${publicId}`;
  const safeUrl = escapeHtml(publicUrl);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>QR Card — ${safeName} — MishiPass</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:2rem auto;padding:0 1rem;color:#111;line-height:1.5}
    .nav{margin-bottom:1.5rem;font-size:0.875rem}
    .card{border:2px solid #111;border-radius:12px;padding:2rem;text-align:center;margin:1rem 0}
    .card h2{margin:0 0 0.5rem 0;font-size:1.25rem}
    .card .id{font-size:1.5rem;font-family:monospace;font-weight:bold;letter-spacing:1px;margin:1rem 0}
    .card .url{font-size:0.8rem;word-break:break-all;color:#555;margin:0.5rem 0}
    .card .note{font-size:0.75rem;color:#888;margin-top:1rem}
    .print-btn{display:inline-block;margin-top:1rem;padding:0.75rem 1.5rem;background:#111;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:1rem}
    @media print {
      .nav,.print-btn{display:none}
      body{margin:0;padding:2rem}
      .card{border-width:3px;padding:3rem}
      .card .id{font-size:2rem}
    }
  </style>
</head>
<body>
  <div class="nav"><a href="/dashboard/cats/${safeId}">&larr; Back to ${safeName}</a></div>
  <div class="card">
    <h2>${safeName}</h2>
    <div class="id">${safeId}</div>
    <div class="url">${safeUrl}</div>
    <p class="note">Generate a QR image from the URL above using any QR code generator.</p>
  </div>
  <button class="print-btn" onclick="window.print()">Print QR Card</button>
</body>
</html>`;

  return htmlResponse(html);
}
