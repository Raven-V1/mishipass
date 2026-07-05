import { MISHIPASS_BACKGROUND_SRC, MISHIPASS_LOGO_SRC, MISHIPASS_PAW_SRC } from "./brandAssets.js";

// Shared HTML utility functions.

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html;charset=UTF-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export const MISHIPASS_DESIGN_CSS = `
:root{
  --space-1:8px;
  --space-2:16px;
  --space-3:24px;
  --space-4:32px;
  --space-5:40px;
  --space-6:48px;
  --space-8:64px;
  --space-10:80px;
  --space-12:96px;
  --touch-target:44px; /* accessibility exception required by acceptance criteria */
  --brand-coral:#FB7654;
  --brand-mint:rgb(102,209,195);
  --brand-peach:#FB8A68;
  --brand-orange:#FF7A59;
  --cream:#fff8f3;
  --cream-2:#fff0e9;
  --pink:#ffe2db;
  --coral:#FB7654;
  --coral-dark:#d85b3f;
  --teal:#24776e;
  --green:#2f7d64;
  --ink:#24302f;
  --muted:#667674;
  --line:#ead8d0;
  --card:#fffdf9;
  --shadow:0 8px 32px rgba(56,38,26,.10);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth;min-height:100%;background:url("${MISHIPASS_BACKGROUND_SRC}") center top/cover no-repeat fixed}
body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink);line-height:1.5;background:transparent;min-height:100vh}
@media(max-width:768px){html{background-attachment:scroll}}
a{color:var(--teal);text-decoration-thickness:2px;text-underline-offset:3px}
img,svg{max-width:100%}
.mp-page{min-height:100vh}
.mp-container{width:min(100%,1184px);margin:0 auto;padding:0 var(--space-3)}
.mp-narrow{width:min(100%,736px);margin:0 auto;padding:0 var(--space-3)}
.mp-section{padding:var(--space-8) 0}
.mp-card{background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow)}
.mp-panel{background:rgba(255,253,249,.88);border:1px solid var(--line);border-radius:8px;padding:var(--space-3)}
.mp-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:var(--space-3)}
.mp-btn,.btn,.btn-primary,.btn-secondary,.btn-danger,.btn-warn,.photo-label,.photo-action,.print-btn,.share,.contact-btn,.submit-btn,button.actions-link,.actions a{display:inline-flex;align-items:center;justify-content:center;min-height:var(--touch-target);padding:var(--space-1) var(--space-2);border:1px solid transparent;border-radius:8px;font:inherit;font-weight:700;line-height:1.2;text-align:center;text-decoration:none;cursor:pointer;overflow-wrap:anywhere}
.mp-btn svg,.btn svg,.btn-primary svg,.btn-secondary svg,.btn-danger svg,.btn-warn svg,.social-btn svg,.tab-btn svg,.tab-link svg{flex:0 0 auto}
.mp-btn-primary,.btn-primary,.submit-btn,.print-btn{background:var(--teal);color:#fff;border-color:var(--teal)}
.mp-btn-secondary,.btn-secondary,.secondary,.photo-label,.photo-action{background:#fff7f0;color:var(--teal);border-color:var(--line)}
.btn-danger{background:#b42318;color:#fff}
.btn-warn{background:var(--coral);color:#fff}
button:disabled,.btn:disabled,.btn-primary:disabled,.btn-secondary:disabled,.btn-danger:disabled,.btn-warn:disabled{opacity:.62;cursor:not-allowed}
label{display:block;margin:0 0 var(--space-1);font-size:.875rem;font-weight:800;color:var(--ink)}
input,select,textarea{width:100%;min-height:var(--touch-target);padding:var(--space-1) var(--space-2);border:1px solid #d8c8bd;border-radius:8px;background:#fff;font:inherit;color:var(--ink)}
textarea{min-height:96px;resize:vertical}
.muted,.empty,.print-note,.photo-status{color:var(--muted)}
.badge,.country-badge,.mode-badge,.status,.vet-badge{display:inline-flex;align-items:center;gap:var(--space-1);max-width:100%;min-height:32px;padding:0 var(--space-2);border-radius:999px;background:#e8faf7;color:var(--teal);font-size:.875rem;font-weight:800;overflow-wrap:anywhere}
.mp-cat-placeholder,.photo-placeholder,.cat-photo-placeholder,.placeholder,.breed-placeholder-art{display:flex;align-items:center;justify-content:center;color:var(--muted);background:linear-gradient(135deg,#fff7f0,#e8faf7);border:1px dashed #d8c8bd;text-align:center}
.mp-back{display:inline-flex;align-items:center;min-height:var(--touch-target);margin-bottom:var(--space-2);font-weight:800}
.brand-lockup{display:inline-grid;grid-template-columns:72px minmax(0,1fr);gap:var(--space-1);align-items:center;width:clamp(176px,18vw,220px);color:var(--ink);text-decoration:none;min-width:0}
.brand-logo{width:72px;aspect-ratio:946/513;border-radius:0;background:transparent url("${MISHIPASS_LOGO_SRC}") center/contain no-repeat;border:0;display:block}
.brand-logo-large{width:224px;max-width:100%;aspect-ratio:946/513;border-radius:0;background:transparent url("${MISHIPASS_LOGO_SRC}") center/contain no-repeat;border:0;display:block}
.brand-word{display:block;font-size:1.875rem;font-weight:900;line-height:.95;color:var(--teal);white-space:nowrap;overflow-wrap:normal}
.brand-word .coral{color:var(--brand-coral)}.brand-word .mint{color:var(--brand-mint)}
.brand-sub{display:block;font-size:.75rem;color:var(--teal);margin-top:var(--space-1);font-weight:800;overflow-wrap:anywhere}
.paw-icon{display:inline-block;width:24px;height:24px;background:transparent url("${MISHIPASS_PAW_SRC}") center/contain no-repeat;flex:0 0 auto}
.paw-icon-sm{width:20px;height:20px}
.paw-icon-lg{width:32px;height:32px}
.mp-header{border-bottom:1px solid var(--line);background:rgba(255,248,243,.94);backdrop-filter:blur(12px)}
.mp-header-inner{min-height:80px;display:flex;align-items:center;justify-content:space-between;gap:var(--space-3)}
.mp-header-actions{display:flex;align-items:center;gap:var(--space-1);flex-wrap:wrap;justify-content:flex-end}
.icon-label{display:inline-flex;align-items:center;gap:var(--space-1)}
.provider-pending{opacity:.72}
@media(max-width:768px){.mp-container,.mp-narrow{padding:0 var(--space-2)}.mp-section{padding:var(--space-6) 0}.mp-grid{grid-template-columns:repeat(8,minmax(0,1fr));gap:var(--space-2)}}
@media(max-width:430px){.mp-container,.mp-narrow{padding:0 var(--space-2)}.mp-section{padding:var(--space-4) 0}.mp-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--space-2)}.brand-lockup{grid-template-columns:56px minmax(0,1fr);width:clamp(144px,54vw,176px)}.brand-logo{width:56px}.brand-word{font-size:1.5rem}.brand-sub{font-size:.625rem}.mp-header-inner{min-height:64px;gap:var(--space-1)}}
`;

export function brandLogoHtml(className = "brand-logo"): string {
  return `<span class="${className}" role="img" aria-label="MishiPass"></span>`;
}

export function brandLockupHtml(href = "/", subcopy = "The digital passport for your cat"): string {
  return `<a class="brand-lockup" href="${href}" aria-label="MishiPass home">${brandLogoHtml()}<span><span class="brand-word"><span class="coral">Mishi</span><span class="mint">Pass</span></span><span class="brand-sub">${subcopy}</span></span></a>`;
}
