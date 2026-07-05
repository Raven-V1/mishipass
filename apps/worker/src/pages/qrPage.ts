import { getCatForOwner } from "../db/index.js";
import { MISHIPASS_DESIGN_CSS, brandLockupHtml, escapeHtml, htmlResponse } from "../utils/html.js";
import { generateQrSvg } from "../utils/qr.js";
import type { RequestContext } from "../middleware/session.js";
import { type LanguageCode, t } from "../utils/i18n.js";
import { renderTopNav, TOP_NAV_CSS } from "./partials/topNav.js";
import { iconQrCode } from "../utils/icons.js";

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
    .qr-shell{max-width:960px;margin:0 auto;padding:var(--space-3) 0 var(--space-6)}
    .qr-hero{display:flex;align-items:center;gap:var(--space-2);margin:var(--space-3) 0 var(--space-1)}
    .qr-hero h1{font-size:clamp(1.75rem,5vw,2.5rem);color:var(--teal);margin:0}
    .qr-hero-sub{color:var(--muted);margin:0 0 var(--space-4);font-weight:700}
    .qr-grid{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-3)}
    .qr-section-title{font-size:1rem;font-weight:900;color:var(--teal);margin:0 0 var(--space-2);display:flex;align-items:center;gap:var(--space-1)}
    .qr-code-box{text-align:center;padding:var(--space-4)}
    .qr-code-box svg{display:block;margin:0 auto var(--space-2);width:200px;height:200px}
    .qr-scan-hint{font-size:.8125rem;color:var(--muted);font-weight:700;margin:0}
    .qr-actions{display:flex;gap:var(--space-2);justify-content:center;flex-wrap:wrap;margin-top:var(--space-3)}
    .qr-actions button,.qr-actions a{flex:1 1 148px;max-width:200px;min-height:44px}
    .preview-card{padding:var(--space-3)}
    .preview-field{display:flex;align-items:center;gap:var(--space-2);padding:var(--space-1) 0;border-bottom:1px solid var(--line);font-size:.9375rem}
    .preview-field:last-child{border-bottom:0}
    .preview-label{flex:0 0 120px;font-weight:900;color:var(--teal);font-size:.875rem}
    .preview-value{color:var(--ink);overflow-wrap:anywhere}
    .preview-no-photo{display:flex;flex-direction:column;align-items:center;justify-content:center;height:120px;border:1px dashed var(--line);border-radius:8px;color:var(--muted);font-weight:700;font-size:.875rem;gap:var(--space-1);margin-bottom:var(--space-2)}
    .print-section{padding:var(--space-4);text-align:center;margin-top:0}
    .print-header{font-weight:900;font-size:1rem;color:var(--teal);margin:0 0 var(--space-1)}
    .print-sub{font-size:.8125rem;color:var(--muted);margin:0 0 var(--space-3)}
    .card-pair{display:flex;gap:var(--space-3);justify-content:center;flex-wrap:wrap;margin-bottom:var(--space-3)}
    .printable-card{border:2px dashed var(--brand-coral);border-radius:12px;padding:var(--space-3);width:256px;background:#fff;text-align:center}
    .card-label{font-size:.6875rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:0 0 var(--space-2)}
    .front-card .card-qr{margin:0 auto var(--space-1);width:120px;height:120px}
    .front-card .card-qr svg{width:120px;height:120px}
    .front-card .card-name{font-size:1.125rem;font-weight:900;color:var(--teal);margin:var(--space-1) 0 var(--space-1)}
    .front-card .reward-pill{display:inline-flex;align-items:center;gap:4px;background:#fff0e9;color:var(--brand-coral);border:1px solid var(--brand-coral);border-radius:999px;padding:.18rem .72rem;font-size:.8125rem;font-weight:900;margin-bottom:var(--space-1)}
    .front-card .contact-note{font-size:.6875rem;color:var(--muted);margin:0}
    .back-card .back-headline{font-size:1rem;font-weight:900;color:var(--teal);line-height:1.28;margin:var(--space-2) 0 var(--space-2)}
    .back-card .back-headline span{color:var(--brand-coral)}
    .back-card ul{list-style:none;padding:0;margin:0 0 var(--space-2);text-align:left;display:grid;gap:4px}
    .back-card ul li{font-size:.75rem;color:var(--muted);font-weight:700;padding-left:1.25em;position:relative}
    .back-card ul li:before{content:"·";position:absolute;left:0;color:var(--brand-coral)}
    .back-card .brand-mark{font-size:1rem;font-weight:900;color:var(--brand-coral);margin:0}
    .scissors{font-size:1rem;color:var(--muted);line-height:1;align-self:center}
    .tip-note{font-size:.8125rem;color:var(--muted);font-weight:700;margin:0}
    .back-link{display:block;margin-bottom:var(--space-3);font-size:.875rem}
    @media print {
      .no-print{display:none!important}
      body{margin:0;padding:0;background:white}
      .qr-shell{max-width:none;padding:0}
      .card-pair{display:flex;justify-content:center;gap:16px;padding:8mm}
      .printable-card{border:1.5px dashed #d8c8bd;border-radius:8px;padding:6mm;width:72mm}
      .front-card .card-qr,.front-card .card-qr svg{width:48mm;height:48mm}
    }
    @media(max-width:700px){.qr-grid{grid-template-columns:1fr}.card-pair{flex-direction:column;align-items:center}.qr-actions button,.qr-actions a{max-width:none}}
    @media(max-width:430px){body{padding:var(--space-2)}.qr-actions button,.qr-actions a{flex-basis:100%}}
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
      <h1>${t(lang, "qrCard")}</h1>
    </div>
    <p class="qr-hero-sub no-print">${t(lang, "printDoubleSided")} — ${t(lang, "cutInstruction")}</p>

    <div class="qr-grid no-print">
      <section class="mp-card qr-code-box">
        <p class="qr-section-title">${iconQrCode(18)} ${t(lang, "qrCard")}</p>
        ${qrSvg}
        <p class="qr-scan-hint">${t(lang, "scanToView")}</p>
        <div class="qr-actions">
          <button class="mp-btn mp-btn-secondary" onclick="window.print()">${t(lang, "printQr")}</button>
          <button class="mp-btn mp-btn-secondary" id="copy-link-btn" onclick="copyPublicLink()">${t(lang, "copyLink")}</button>
        </div>
      </section>

      <section class="mp-card preview-card">
        <p class="qr-section-title">${t(lang, "viewPublicProfile")}</p>
        ${cat.photo_r2_key
          ? `<img src="/media/cats/${safeId}/photo" alt="${safeName}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:var(--space-2)" />`
          : `<div class="preview-no-photo"><span>${t(lang, "noPhoto")}</span></div>`
        }
        <div class="preview-field"><span class="preview-label">${t(lang, "name")}</span><span class="preview-value">${safeName}</span></div>
        <div class="preview-field"><span class="preview-label">${t(lang, "country")}</span><span class="preview-value">${escapeHtml(cat.country_code ?? "")}</span></div>
        ${cat.breed_mix ? `<div class="preview-field"><span class="preview-label">${t(lang, "breedMix")}</span><span class="preview-value">${escapeHtml(cat.breed_mix)}</span></div>` : ""}
        ${cat.sex ? `<div class="preview-field"><span class="preview-label">${t(lang, "sex")}</span><span class="preview-value">${escapeHtml(cat.sex)}</span></div>` : ""}
        ${cat.current_mode ? `<div class="preview-field"><span class="preview-label">${t(lang, "mode")}</span><span class="preview-value mode-badge mode-${escapeHtml(cat.current_mode)}">${escapeHtml(cat.current_mode)}</span></div>` : ""}
        <div style="margin-top:var(--space-2)">
          <a class="mp-btn mp-btn-secondary" href="/c/${safeId}?lang=${lang}" target="_blank">${t(lang, "viewPublicProfile")}</a>
        </div>
      </section>
    </div>

    <section class="mp-card print-section">
      <p class="print-header no-print">${t(lang, "printDoubleSided")}</p>
      <p class="print-sub no-print">${t(lang, "cutInstruction")}</p>
      <div class="card-pair">
        <div class="printable-card front-card">
          <p class="card-label">FRONT</p>
          <div class="card-qr">${qrSvg}</div>
          <p class="card-name">${safeName}</p>
          <span class="reward-pill">&#127873; ${t(lang, "helpBringHome")}</span>
          <p class="contact-note">${t(lang, "emergencyContact")}</p>
        </div>
        <span class="scissors no-print" aria-hidden="true">&#9986;</span>
        <div class="printable-card back-card">
          <p class="card-label">BACK</p>
          <p class="back-headline">${t(lang, "ifYouFindCat")}</p>
          <ul>
            <li>${t(lang, "scanToView")}</li>
            <li>${t(lang, "ownerWillBeNotified")}</li>
            <li>${t(lang, "thankYouForHelping")}</li>
          </ul>
          <p class="brand-mark">MishiPass</p>
        </div>
      </div>
      <div class="no-print" style="display:flex;gap:var(--space-2);justify-content:center;flex-wrap:wrap;margin-top:var(--space-2)">
        <button class="mp-btn mp-btn-secondary" onclick="window.print()">${t(lang, "printCard")}</button>
      </div>
      <p class="tip-note no-print" style="margin-top:var(--space-2)">${t(lang, "tipPrintCardstock")}</p>
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
