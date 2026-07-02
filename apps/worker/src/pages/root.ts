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
    main{max-width:1120px;margin:0 auto;padding:1rem}section{padding:1.6rem 0;border-top:1px solid #eee}.hero{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(280px,.9fr);gap:clamp(1rem,3vw,2rem);align-items:center;min-height:74vh;border-top:0}.language{display:flex;justify-content:flex-end;margin-bottom:1rem}.language label{display:block;font-size:.8rem;font-weight:700;margin-bottom:.2rem}.language select{padding:.55rem;border:1px solid #ccc;border-radius:6px;min-height:42px}h1{font-size:clamp(2.2rem,5vw,4rem);line-height:1.05;margin:.3rem 0;overflow-wrap:anywhere}h2{font-size:1.35rem;margin:0 0 .8rem}.tagline{font-size:1.25rem;color:#333;margin:.5rem 0 1rem;overflow-wrap:anywhere}.desc{max-width:650px;color:#555}.actions,.grid{display:flex;gap:.65rem;flex-wrap:wrap}.cta{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:.72rem 1rem;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-size:.95rem;text-align:center;line-height:1.2;overflow-wrap:anywhere}.cta.secondary{background:#eee;color:#111}.cat-art{min-height:320px;border-radius:8px;background:linear-gradient(135deg,#faf7f0,#e6f2f0);display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid #e6e0d5}.cat-art svg{width:min(90%,430px);height:auto}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem}.card{border:1px solid #ddd;border-radius:8px;padding:1rem;background:#fff;min-width:0}.card h3{margin:.1rem 0 .4rem}.card p,.card{overflow-wrap:anywhere}.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:.75rem}.step{border-left:4px solid #111;padding:.35rem .75rem;min-height:48px;display:flex;align-items:center;overflow-wrap:anywhere}.muted{color:#555}@media(max-width:760px){main{padding:.85rem}.hero{grid-template-columns:1fr;min-height:auto;padding-top:1rem}.language{justify-content:flex-start}h1{font-size:2.4rem}.cat-art{min-height:230px}.actions .cta{flex:1 1 190px}.cards{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <main>
  <div class="language">${languageSelectHtml(lang)}</div>
  <section class="hero">
    <div>
      <p class="muted">${t(lang, "tagline")}</p>
      <h1>MishiPass Beta 1.5</h1>
      <p class="tagline">${t(lang, "rootSubheadline")}</p>
      <p class="desc">${t(lang, "description")}</p>
      <div class="actions">
        <a class="cta" href="/dashboard?lang=${lang}">${t(lang, "dashboard")}</a>
        <a class="cta secondary" href="/recovery-board?lang=${lang}">${t(lang, "recoveryBoard")}</a>
        <a class="cta secondary" href="/history?lang=${lang}">${t(lang, "history")}</a>
      </div>
    </div>
    <div class="cat-art" aria-label="${t(lang, "rootHeroAlt")}">
      <svg viewBox="0 0 420 320" role="img" aria-label="${t(lang, "rootHeroAlt")}">
        <ellipse cx="208" cy="190" rx="132" ry="82" fill="#fffdf9" stroke="#111" stroke-width="5"/>
        <circle cx="170" cy="122" r="64" fill="#fffdf9" stroke="#111" stroke-width="5"/>
        <path d="M128 78 102 38 101 98" fill="#fffdf9" stroke="#111" stroke-width="5" stroke-linejoin="round"/>
        <path d="M205 76 236 40 226 101" fill="#fffdf9" stroke="#111" stroke-width="5" stroke-linejoin="round"/>
        <path d="M132 168 Q170 193 208 168" fill="none" stroke="#111" stroke-width="6" stroke-linecap="round"/>
        <circle cx="145" cy="121" r="7" fill="#111"/><circle cx="192" cy="121" r="7" fill="#111"/>
        <path d="M165 140 174 140 170 148Z" fill="#111"/>
        <path d="M255 147c36-42 88-25 91 15 4 48-78 38-55-1" fill="none" stroke="#111" stroke-width="12" stroke-linecap="round"/>
        <ellipse cx="225" cy="171" rx="34" ry="24" fill="#8b5e3c"/>
        <ellipse cx="145" cy="88" rx="24" ry="18" fill="#8b5e3c"/>
        <ellipse cx="281" cy="211" rx="32" ry="22" fill="#8b5e3c"/>
        <rect x="154" y="211" width="68" height="68" rx="8" fill="#111"/>
        <rect x="166" y="223" width="16" height="16" fill="#fff"/><rect x="194" y="223" width="16" height="16" fill="#fff"/>
        <rect x="166" y="251" width="16" height="16" fill="#fff"/><rect x="194" y="251" width="16" height="16" fill="#fff"/>
        <rect x="184" y="241" width="10" height="10" fill="#fff"/>
      </svg>
    </div>
  </section>
  <section><h2>${t(lang, "howItWorks")}</h2><div class="steps"><div class="step">${t(lang, "registerCatStep")}</div><div class="step">${t(lang, "printQrStep")}</div><div class="step">${t(lang, "stepSwitchMode")}</div><div class="step">${t(lang, "finderVetStep")}</div></div></section>
  <section><h2>${t(lang, "modeCards")}</h2><div class="cards"><article class="card"><h3>${t(lang, "activeProfile")}</h3><p>${t(lang, "modeActiveSummary")}</p></article><article class="card"><h3>${t(lang, "missingAlert")}</h3><p>${t(lang, "modeMissingSummary")}</p></article><article class="card"><h3>${t(lang, "vetVisit")}</h3><p>${t(lang, "modeVetSummary")}</p></article></div></section>
  <section><h2>${t(lang, "privacyPromise")}</h2><div class="cards"><div class="card">${t(lang, "privacyNoExactAddress")}</div><div class="card">${t(lang, "privacyOwnerControlledContact")}</div><div class="card">${t(lang, "privacyCartillaPrivate")}</div><div class="card">${t(lang, "privacyMedicationDocumentationOnly")}</div></div></section>
  <section><h2>${t(lang, "cartilla")}</h2><p class="muted">${t(lang, "cartillaSummary")}</p></section>
  <section><h2>${t(lang, "recoveryBoard")}</h2><p class="muted">${t(lang, "recoveryBoardSummary")}</p></section>
  </main>
  ${LANGUAGE_SCRIPT}
</body>
</html>`;
}

function buildHistoryHtml(request: Request): string {
  const lang = getLanguageFromRequest(request);
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${t(lang, "history")} — MishiPass</title><style>*{box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;max-width:780px;margin:2rem auto;padding:0 1rem;line-height:1.65;color:#111}a{color:#111}.language{margin-bottom:1rem}.language label{display:block;font-size:.8rem;font-weight:700}.language select{padding:.55rem;border:1px solid #ccc;border-radius:6px;min-height:42px}h1{font-size:clamp(1.8rem,6vw,2.5rem);overflow-wrap:anywhere}p{overflow-wrap:anywhere}</style></head><body><div class="language">${languageSelectHtml(lang)}</div><p><a href="/?lang=${lang}">&larr; ${t(lang, "home")}</a></p><h1>${t(lang, "history")}</h1><p>${t(lang, "historyIntro1")}</p><p>${t(lang, "historyIntro2")}</p><p>${t(lang, "historyIntro3")}</p>${LANGUAGE_SCRIPT}</body></html>`;
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
