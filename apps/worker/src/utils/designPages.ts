import { type LanguageCode } from "./i18n.js";
import { MISHIPASS_DESIGN_CSS, brandLockupHtml } from "./html.js";

interface StatePageOptions {
  lang: LanguageCode;
  title: string;
  subtitle: string;
  imageSrc: string;
  ctaHref?: string;
  ctaLabel?: string;
  backHref?: string;
  backLabel?: string;
}

export function renderIllustratedStatePage({
  lang,
  title,
  subtitle,
  imageSrc,
  ctaHref,
  ctaLabel,
  backHref,
  backLabel,
}: StatePageOptions): string {
  const cta = ctaHref && ctaLabel
    ? `<a class="mp-btn mp-btn-primary state-cta" href="${ctaHref}">${ctaLabel}</a>`
    : "";
  const back = backHref && backLabel
    ? `<a class="state-back" href="${backHref}">${backLabel}</a>`
    : "";

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    ${MISHIPASS_DESIGN_CSS}
    body{padding:var(--space-3)}
    .state-shell{width:min(100%,960px);margin:0 auto;padding:var(--space-3) 0 var(--space-6)}
    .state-card{padding:var(--space-4);text-align:center}
    .state-back{display:inline-flex;align-items:center;min-height:var(--touch-target);margin-bottom:var(--space-3);font-weight:800}
    .state-illustration{display:block;width:min(100%,420px);margin:0 auto var(--space-3)}
    .state-card h1{margin:0 0 var(--space-1);font-size:clamp(2.25rem,6vw,3.75rem);line-height:1.02;color:var(--teal)}
    .state-card p{max-width:420px;margin:0 auto;color:var(--muted);font-size:1.0625rem;font-weight:700}
    .state-cta{margin-top:var(--space-4);min-width:min(100%,320px);background:var(--brand-orange);border-color:var(--brand-orange)}
    @media(max-width:430px){body{padding:var(--space-2)}.state-card{padding:var(--space-3)}.state-cta{width:100%;min-width:0}}
  </style>
</head>
<body>
  <main class="state-shell">
    ${brandLockupHtml(`/?lang=${lang}`)}
    ${back}
    <section class="mp-card state-card">
      <img class="state-illustration" src="${imageSrc}" alt="" />
      <h1>${title}</h1>
      <p>${subtitle}</p>
      ${cta}
    </section>
  </main>
</body>
</html>`;
}
