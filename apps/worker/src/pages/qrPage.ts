import { validateId } from "@mishipass/shared-validation";
import { getCatForOwner } from "../db/index.js";
import { escapeHtml, htmlResponse } from "../utils/html.js";
import { generateQrSvg } from "../utils/qr.js";
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

  const cat = await getCatForOwner(db, publicId, ctx.ownerId);
  if (!cat) {
    return new Response("Not Found", { status: 404 });
  }

  const safeName = escapeHtml(cat.name);
  const safeId = escapeHtml(publicId);
  const publicUrl = `${publicBaseUrl}/c/${publicId}`;
  const qrSvg = generateQrSvg(publicUrl);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>QR Card — ${safeName} — MishiPass</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:2rem auto;padding:0 1rem;color:#111;line-height:1.5}
    .nav{margin-bottom:1.5rem;font-size:0.875rem}
    .card{border:2px solid #111;border-radius:8px;padding:1rem;text-align:center;margin:1rem 0;max-width:200px;margin-left:auto;margin-right:auto}
    .card h2{margin:0 0 0.25rem 0;font-size:0.9rem}
    .qr-image{margin:0.5rem auto;display:block}
    .qr-image svg{display:block;margin:0 auto;width:120px;height:120px}
    .card .id{font-size:0.75rem;font-family:monospace;font-weight:bold;letter-spacing:0.5px;margin:0.25rem 0 0}
    .print-btn{display:inline-block;margin-top:1rem;padding:0.5rem 1.25rem;background:#111;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.875rem}
    .print-note{font-size:0.75rem;color:#888;margin-top:0.5rem}
    @media print {
      .nav,.print-btn,.print-note{display:none}
      body{margin:0;padding:0}
      .card{border:1.5px solid #000;border-radius:4px;padding:3mm;max-width:42mm;width:42mm;margin:0 auto}
      .card h2{font-size:7pt;margin:0 0 1mm 0}
      .qr-image svg{width:30mm;height:30mm}
      .card .id{font-size:6pt;margin:1mm 0 0}
      .card .url{display:none}
    }
  </style>
</head>
<body>
  <div class="nav"><a href="/dashboard/cats/${safeId}">&larr; Back to ${safeName}</a></div>
  <div class="card">
    <h2>${safeName}</h2>
    <div class="qr-image">${qrSvg}</div>
    <div class="id">${safeId}</div>
    <div class="url" style="font-size:0.6rem;color:#999;word-break:break-all;margin-top:2px">${escapeHtml(publicUrl)}</div>
  </div>
  <button class="print-btn" onclick="window.print()">Print Collar Tag</button>
  <p class="print-note">Prints at ~42mm width — fits a standard cat collar tag.</p>
</body>
</html>`;

  return htmlResponse(html);
}
