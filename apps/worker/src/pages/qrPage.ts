import { getCatForOwner } from "../db/index.js";
import { MISHIPASS_DESIGN_CSS, brandLockupHtml, escapeHtml, htmlResponse } from "../utils/html.js";
import { generateQrSvg } from "../utils/qr.js";
import type { RequestContext } from "../middleware/session.js";
import { type LanguageCode, t } from "../utils/i18n.js";
import { renderTopNav, TOP_NAV_CSS } from "./partials/topNav.js";
import { iconContact, iconQrCode } from "../utils/icons.js";
import { MISHIPASS_LOGO_SRC } from "../utils/brandAssets.js";

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
  const safeUrl = escapeHtml(publicUrl);
  const qrSvg = generateQrSvg(publicUrl);

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t(lang, "qrCard")} — ${safeName} — MishiPass</title>
  <style>
    ${MISHIPASS_DESIGN_CSS}
    ${TOP_NAV_CSS}
    body{padding:var(--space-3)}
    .qr-shell{max-width:1140px;margin:0 auto;padding:var(--space-3) 0 var(--space-6)}
    .back-link{display:inline-flex;margin:var(--space-2) 0;font-size:.875rem;font-weight:800}
    .qr-hero{display:flex;align-items:flex-start;gap:var(--space-2);margin:var(--space-2) 0 var(--space-4)}
    .qr-hero h1{font-size:clamp(2.25rem,6vw,3.5rem);line-height:1.02;color:var(--teal);margin:0 0 var(--space-1)}
    .qr-hero-sub{color:var(--muted);margin:0;font-weight:700;font-size:1rem}
    .print-section{padding:var(--space-4)}
    .print-header{font-weight:900;font-size:1.25rem;color:var(--teal);margin:0 0 var(--space-1);display:flex;align-items:center;justify-content:center;gap:var(--space-1)}
    .print-sub{font-size:.9375rem;color:var(--muted);margin:0 0 var(--space-4);text-align:center;font-weight:700}
    .card-pair{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:var(--space-3);align-items:center;margin-bottom:var(--space-4)}
    .printable-card{position:relative;border:2px dashed #f0b39f;border-radius:22px;padding:var(--space-3);min-height:380px;background:rgba(255,255,255,.94);text-align:center;box-shadow:0 14px 40px rgba(56,38,26,.08)}
    .printable-card:before{content:"";position:absolute;inset:18px;border-radius:18px;background:linear-gradient(160deg,rgba(255,240,233,.65),rgba(232,250,247,.45));z-index:0}
    .printable-card>*{position:relative;z-index:1}
    .card-label{display:inline-flex;align-items:center;justify-content:center;min-height:28px;padding:0 .9rem;border-radius:999px;background:#fff0e9;color:var(--brand-coral);font-size:.6875rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;margin:0 0 var(--space-2)}
    .front-top{display:grid;grid-template-columns:minmax(0,1fr) 148px;gap:var(--space-2);align-items:center;margin-bottom:var(--space-2)}
    .front-cat{display:flex;align-items:center;justify-content:center;min-height:164px;border-radius:18px;background:rgba(255,255,255,.78)}
    .front-cat img{width:100%;max-width:220px;object-fit:contain}
    .card-qr{margin:0 auto;border-radius:18px;padding:12px;background:#fff;border:2px solid #f0b39f;box-shadow:0 8px 24px rgba(56,38,26,.10)}
    .card-qr svg{display:block;width:124px;height:124px}
    .card-name{font-size:1.65rem;font-weight:900;color:var(--teal);margin:var(--space-2) 0 .35rem}
    .reward-pill{display:inline-flex;align-items:center;gap:6px;background:#fff0e9;color:var(--brand-coral);border-radius:999px;padding:.42rem .9rem;font-size:.875rem;font-weight:900}
    .front-copy{margin:var(--space-2) 0;font-weight:800;color:var(--ink)}
    .contact-strip{display:inline-flex;align-items:center;gap:8px;justify-content:center;width:100%;min-height:44px;border-radius:999px;background:#eef8f5;color:var(--teal);font-size:.875rem;font-weight:800;padding:0 var(--space-2)}
    .back-card{display:flex;flex-direction:column;justify-content:center}
    .back-headline{font-size:2rem;font-weight:900;color:var(--ink);line-height:1.08;margin:var(--space-2) 0}
    .back-headline span{color:var(--brand-coral)}
    .back-divider{width:72%;height:1px;background:var(--line);margin:0 auto var(--space-3)}
    .back-list{list-style:none;padding:0;margin:0 auto var(--space-3);width:min(100%,260px);display:grid;gap:var(--space-2);text-align:left}
    .back-list li{display:flex;align-items:flex-start;gap:10px;font-size:.95rem;color:var(--ink);font-weight:700}
    .back-list li svg{color:var(--teal);margin-top:2px}
    .brand-mark{font-size:1.8rem;font-weight:900;color:var(--brand-coral);margin:.5rem 0 0}
    .brand-mark span{color:var(--brand-mint)}
    .scissors{font-size:1.3rem;color:var(--muted);line-height:1;align-self:center}
    .qr-actions{display:flex;gap:var(--space-2);justify-content:center;flex-wrap:wrap}
    .qr-actions button,.qr-actions a{flex:1 1 240px;max-width:280px;min-height:52px}
    .print-card-btn{background:var(--brand-orange);border-color:var(--brand-orange);color:#fff}
    .tip-note{font-size:.875rem;color:var(--muted);font-weight:700;margin:var(--space-2) 0 0;text-align:center}
    @media print {
      .no-print{display:none!important}
      body{margin:0;padding:0;background:white}
      .qr-shell{max-width:none;padding:0}
      .card-pair{display:grid;grid-template-columns:1fr 8mm 1fr;gap:8mm;padding:8mm}
      .printable-card{border:1.5px dashed #d8c8bd;border-radius:8px;padding:6mm;min-height:0}
      .front-card .card-qr svg{width:40mm;height:40mm}
    }
    @media(max-width:860px){.card-pair{grid-template-columns:1fr}.scissors{display:none}.printable-card{min-height:0}}
    @media(max-width:560px){body{padding:var(--space-2)}.print-section{padding:var(--space-3)}.front-top{grid-template-columns:1fr}.qr-actions button,.qr-actions a{flex-basis:100%;max-width:none}.back-headline{font-size:1.65rem}}
  </style>
</head>
<body>
  <main class="qr-shell">
    <div class="no-print">
      ${renderTopNav(lang, { authenticated: true })}
      ${brandLockupHtml(`/?lang=${lang}`)}
      <a class="back-link mp-back" href="/dashboard/cats/${safeId}?lang=${lang}">&larr; ${safeName}</a>
    </div>

    <div class="qr-hero no-print">
      <div>${iconQrCode(32)}</div>
      <div>
        <h1>${t(lang, "qrCard")}</h1>
        <p class="qr-hero-sub">${t(lang, "printDoubleSided")} - ${t(lang, "cutInstruction")}</p>
      </div>
    </div>

    <section class="mp-card print-section">
      <p class="print-header no-print">${t(lang, "printDoubleSided")}</p>
      <p class="print-sub no-print">${t(lang, "cutInstruction")}</p>
      <div class="card-pair">
        <div class="printable-card front-card">
          <p class="card-label">FRONT</p>
          <div class="front-top">
            <div class="front-cat">${cat.photo_r2_key
              ? `<img src="/media/cats/${safeId}/photo" alt="${safeName}" />`
              : `<img src="${MISHIPASS_LOGO_SRC}" alt="MishiPass cat" />`}</div>
            <div class="card-qr">${qrSvg}</div>
          </div>
          <span class="reward-pill">&#127873; ${t(lang, "scanToMeetMe")}</span>
          <p class="front-copy">${t(lang, "thankYouForHelping")}</p>
          <div class="contact-strip">${iconContact(16)} <span>${t(lang, "emergencyContact")}</span></div>
        </div>
        <span class="scissors no-print" aria-hidden="true">&#9986;</span>
        <div class="printable-card back-card">
          <p class="card-label">BACK</p>
          <p class="back-headline">If you find this cat,<br /><span>scan this QR.</span></p>
          <div class="back-divider"></div>
          <ul class="back-list">
            <li>${iconContact(16)} <span>${t(lang, "scanToView")}</span></li>
            <li>${iconContact(16)} <span>${t(lang, "ownerWillBeNotified")}</span></li>
            <li>${iconContact(16)} <span>${t(lang, "thankYouForHelping")}</span></li>
          </ul>
          <p class="brand-mark">Mishi<span>Pass</span></p>
        </div>
      </div>
      <div class="qr-actions no-print">
        <button class="mp-btn mp-btn-secondary" id="copy-link-btn" onclick="copyPublicLink()">${t(lang, "copyLink")}</button>
        <button class="mp-btn print-card-btn" onclick="window.print()">${t(lang, "printCard")}</button>
      </div>
      <p class="tip-note no-print">${t(lang, "tipPrintCardstock")}</p>
    </section>
  </main>
  <script>
  function copyPublicLink(){
    var url=${JSON.stringify(safeUrl)};
    var btn=document.getElementById("copy-link-btn");
    if(!btn)return;
    if(navigator.clipboard){
      navigator.clipboard.writeText(url).then(function(){
        btn.textContent=${JSON.stringify(t(lang, "linkCopied"))};
        setTimeout(function(){btn.textContent=${JSON.stringify(t(lang, "copyLink"))};},2000);
      }).catch(fallback);
    } else { fallback(); }
    function fallback(){
      var ta=document.createElement("textarea");
      ta.value=url;ta.style.position="fixed";ta.style.opacity="0";
      document.body.appendChild(ta);ta.select();document.execCommand("copy");
      document.body.removeChild(ta);
      btn.textContent=${JSON.stringify(t(lang, "linkCopied"))};
      setTimeout(function(){btn.textContent=${JSON.stringify(t(lang, "copyLink"))};},2000);
    }
  }
  </script>
</body>
</html>`;

  return htmlResponse(html);
}
