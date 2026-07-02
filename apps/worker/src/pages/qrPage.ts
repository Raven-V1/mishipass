import { getCatForOwner } from "../db/index.js";
import { MISHIPASS_DESIGN_CSS, escapeHtml, htmlResponse } from "../utils/html.js";
import { generateQrSvg } from "../utils/qr.js";
import type { RequestContext } from "../middleware/session.js";
import { type LanguageCode, t } from "../utils/i18n.js";

export async function handleQrPage(
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
  const publicUrl = `${publicBaseUrl}/c/${publicId}`;
  const qrSvg = generateQrSvg(publicUrl);

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t(lang, "qrCard")} — ${safeName} — MishiPass</title>
  <style>
    ${MISHIPASS_DESIGN_CSS}
    body{padding:var(--space-3)}
    .qr-wrap{max-width:560px;margin:var(--space-6) auto}
    .nav{margin-bottom:var(--space-3);font-size:0.875rem}
    .card{border:2px solid var(--teal);border-radius:16px;padding:var(--space-3);text-align:center;margin:var(--space-3) auto;max-width:240px;background:#fff;box-shadow:var(--shadow)}
    .card h2{margin:0 0 var(--space-1);font-size:1rem;color:var(--teal)}
    .qr-image{margin:var(--space-2) auto;display:block}
    .qr-image svg{display:block;margin:0 auto;width:120px;height:120px}
    .card .id{font-size:0.75rem;font-family:monospace;font-weight:bold;letter-spacing:0;margin:var(--space-1) 0 0}
    .print-btn{margin-top:var(--space-2)}
    .print-note{font-size:0.75rem;margin-top:var(--space-1)}
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
  <main class="qr-wrap">
    <div class="nav"><a class="mp-back" href="/dashboard/cats/${safeId}?lang=${lang}">&larr; ${safeName}</a></div>
    <div class="card">
      <h2>${safeName}</h2>
      <div class="qr-image">${qrSvg}</div>
      <div class="id">${safeId}</div>
      <div class="url" style="font-size:0.625rem;color:#667674;word-break:break-all;margin-top:8px">${escapeHtml(publicUrl)}</div>
    </div>
    <button class="print-btn" onclick="window.print()">${t(lang, "qrCard")}</button>
    <p class="print-note">Prints at about 42mm width for a standard cat collar tag.</p>
  </main>
</body>
</html>`;

  return htmlResponse(html);
}
