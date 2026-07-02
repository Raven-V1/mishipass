import { htmlResponse } from "../utils/html.js";
import { getLanguageFromRequest, LANGUAGE_SCRIPT, languageSelectHtml, t } from "../utils/i18n.js";

function buildRootHtml(request: Request): string {
  const lang = getLanguageFromRequest(request);
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MishiPass Beta 1.5</title>
  <meta name="description" content="${t(lang, "tagline")}" />
  <style>
    *{box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;margin:0;color:#111;line-height:1.55;background:#fff}
    main{max-width:1080px;margin:0 auto;padding:1rem}section{padding:1.5rem 0;border-top:1px solid #eee}.hero{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(260px,.8fr);gap:1.5rem;align-items:center;min-height:78vh;border-top:0}.language{display:flex;justify-content:flex-end;margin-bottom:1rem}.language label{display:block;font-size:.8rem;font-weight:700;margin-bottom:.2rem}.language select{padding:.55rem;border:1px solid #ccc;border-radius:6px}h1{font-size:clamp(2rem,5vw,4rem);line-height:1.05;margin:.3rem 0}h2{font-size:1.35rem;margin:0 0 .8rem}.tagline{font-size:1.25rem;color:#333;margin:.5rem 0 1rem}.desc{max-width:650px;color:#555}.actions,.grid{display:flex;gap:.6rem;flex-wrap:wrap}.cta{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:.7rem 1rem;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-size:.95rem}.cta.secondary{background:#eee;color:#111}.cat-art{min-height:300px;border-radius:8px;background:linear-gradient(135deg,#f5f5f5,#e8f2ef);display:flex;align-items:center;justify-content:center;overflow:hidden}.cat-art svg{width:min(86%,420px);height:auto}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:1rem}.card{border:1px solid #ddd;border-radius:8px;padding:1rem;background:#fff}.card h3{margin:.1rem 0 .4rem}.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:.75rem}.step{border-left:4px solid #111;padding:.25rem .75rem}.muted{color:#555}@media(max-width:760px){.hero{grid-template-columns:1fr;min-height:auto;padding-top:1rem}.language{justify-content:flex-start}h1{font-size:2.4rem}.cat-art{min-height:220px}}
  </style>
</head>
<body>
  <main>
  <div class="language">${languageSelectHtml(lang)}</div>
  <section class="hero">
    <div>
      <p class="muted">${t(lang, "tagline")}</p>
      <h1>MishiPass Beta 1.5</h1>
      <p class="tagline">One QR. Three modes. Safer recovery for cats.</p>
      <p class="desc">${t(lang, "description")}</p>
      <div class="actions">
        <a class="cta" href="/dashboard?lang=${lang}">${t(lang, "dashboard")}</a>
        <a class="cta secondary" href="/recovery-board?lang=${lang}">${t(lang, "recoveryBoard")}</a>
        <a class="cta secondary" href="/history?lang=${lang}">${t(lang, "history")}</a>
      </div>
    </div>
    <div class="cat-art" aria-label="Cat illustration">
      <svg viewBox="0 0 420 320" role="img" aria-label="MishiPass cat QR illustration">
        <rect x="45" y="42" width="330" height="220" rx="28" fill="#fff" stroke="#111" stroke-width="6"/>
        <circle cx="160" cy="150" r="58" fill="#111"/><circle cx="260" cy="150" r="58" fill="#111"/>
        <circle cx="160" cy="150" r="22" fill="#fff"/><circle cx="260" cy="150" r="22" fill="#fff"/>
        <path d="M132 95 98 55 92 122" fill="#111"/><path d="M288 95 322 55 328 122" fill="#111"/>
        <path d="M183 205 Q210 225 237 205" fill="none" stroke="#111" stroke-width="8" stroke-linecap="round"/>
        <rect x="78" y="224" width="64" height="64" rx="8" fill="#111"/><rect x="158" y="224" width="28" height="28" fill="#111"/><rect x="214" y="224" width="28" height="28" fill="#111"/><rect x="278" y="224" width="64" height="64" rx="8" fill="#111"/>
      </svg>
    </div>
  </section>
  <section><h2>How it works</h2><div class="steps"><div class="step">Register cat</div><div class="step">Print/save QR</div><div class="step">Switch mode when needed</div><div class="step">Finder or vet sees the correct page</div></div></section>
  <section><h2>Modes</h2><div class="cards"><article class="card"><h3>${t(lang, "activeProfile")}</h3><p>Public-safe profile and contact preference.</p></article><article class="card"><h3>${t(lang, "missingAlert")}</h3><p>Public alert, sighting reports, WhatsApp-ready card, and board listing.</p></article><article class="card"><h3>${t(lang, "vetVisit")}</h3><p>Temporary visit form that returns the QR to Active Profile after Save & Finish.</p></article></div></section>
  <section><h2>Privacy promise</h2><div class="cards"><div class="card">No exact address</div><div class="card">Owner-controlled contact</div><div class="card">Cartilla stays private</div><div class="card">Medication Record is documentation-only</div></div></section>
  <section><h2>${t(lang, "cartilla")}</h2><p class="muted">Vet visits, vaccines, sticker photos, and ${t(lang, "medicationRecord")} entries for the owner dashboard.</p></section>
  <section><h2>${t(lang, "recoveryBoard")}</h2><p class="muted">Active Missing Alert cats appear with public fields, city and alert-age filters, and report-sighting links.</p></section>
  </main>
  ${LANGUAGE_SCRIPT}
</body>
</html>`;
}

function buildHistoryHtml(request: Request): string {
  const lang = getLanguageFromRequest(request);
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${t(lang, "history")} — MishiPass</title><style>body{font-family:system-ui,-apple-system,sans-serif;max-width:760px;margin:2rem auto;padding:0 1rem;line-height:1.65;color:#111}a{color:#111}.language{margin-bottom:1rem}.language label{display:block;font-size:.8rem;font-weight:700}.language select{padding:.55rem;border:1px solid #ccc;border-radius:6px}h1{font-size:2rem}</style></head><body><div class="language">${languageSelectHtml(lang)}</div><p><a href="/?lang=${lang}">&larr; ${t(lang, "home")}</a></p><h1>${t(lang, "history")}</h1><p>MishiPass exists because a cat's QR tag should keep working when the situation changes. The same QR can show a calm Active Profile, a Missing Alert, or a temporary Vet Visit form without printing a new code.</p><p>Beta 1.5 focuses on the core Version 1 path: privacy-first owner control, public recovery help when a cat is missing, and a private Digital Cartilla for documentation.</p><p>MishiPass is built for cats first. It is not an official passport, legal ID, travel document, AI vet, or medical advice system.</p>${LANGUAGE_SCRIPT}</body></html>`;
}

export function handleRoot(request: Request): Response {
  const method = request.method;
  if (method === "HEAD") {
    return new Response(null, {
      status: 200,
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  return htmlResponse(buildRootHtml(request));
}

export function handleHistory(request: Request): Response {
  return htmlResponse(buildHistoryHtml(request));
}
