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
  --space-6:48px;
  --space-8:64px;
  --space-10:80px;
  --space-12:96px;
  --touch-target:44px; /* accessibility exception required by acceptance criteria */
  --cream:#fff8ee;
  --cream-2:#fff1e3;
  --pink:#ffe4e8;
  --coral:#f06f61;
  --coral-dark:#c94f45;
  --teal:#0f6b63;
  --green:#2f7d64;
  --ink:#24302f;
  --muted:#667674;
  --line:#ead9ce;
  --card:#fffdf9;
  --shadow:0 16px 48px rgba(56,38,26,.10);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink);line-height:1.5;background:var(--cream);background-image:radial-gradient(circle at 16px 16px,rgba(15,107,99,.08) 0 4px,transparent 5px),radial-gradient(circle at 40px 32px,rgba(240,111,97,.08) 0 3px,transparent 4px);background-size:96px 96px}
a{color:var(--teal);text-decoration-thickness:2px;text-underline-offset:3px}
img,svg{max-width:100%}
.mp-page{min-height:100vh}
.mp-container{width:min(100%,1184px);margin:0 auto;padding:0 var(--space-3)}
.mp-narrow{width:min(100%,736px);margin:0 auto;padding:0 var(--space-3)}
.mp-section{padding:var(--space-8) 0}
.mp-card{background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow)}
.mp-panel{background:rgba(255,253,249,.88);border:1px solid var(--line);border-radius:16px;padding:var(--space-3)}
.mp-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:var(--space-3)}
.mp-btn,.btn,.btn-primary,.btn-secondary,.btn-danger,.btn-warn,.photo-label,.photo-action,.print-btn,.share,.contact-btn,.submit-btn,button.actions-link,.actions a{display:inline-flex;align-items:center;justify-content:center;min-height:var(--touch-target);padding:var(--space-1) var(--space-2);border:1px solid transparent;border-radius:8px;font:inherit;font-weight:700;line-height:1.2;text-align:center;text-decoration:none;cursor:pointer;overflow-wrap:anywhere}
.mp-btn-primary,.btn-primary,.submit-btn,.print-btn{background:var(--teal);color:#fff;border-color:var(--teal)}
.mp-btn-secondary,.btn-secondary,.secondary,.photo-label,.photo-action{background:#fff7f0;color:var(--teal);border-color:var(--line)}
.btn-danger{background:#b42318;color:#fff}
.btn-warn{background:var(--coral);color:#fff}
button:disabled,.btn:disabled,.btn-primary:disabled,.btn-secondary:disabled,.btn-danger:disabled,.btn-warn:disabled{opacity:.62;cursor:not-allowed}
label{display:block;margin:0 0 var(--space-1);font-size:.875rem;font-weight:800;color:var(--ink)}
input,select,textarea{width:100%;min-height:var(--touch-target);padding:var(--space-1) var(--space-2);border:1px solid #d8c8bd;border-radius:8px;background:#fff;font:inherit;color:var(--ink)}
textarea{min-height:96px;resize:vertical}
.muted,.empty,.print-note,.photo-status{color:var(--muted)}
.badge,.country-badge,.mode-badge,.status,.vet-badge{display:inline-flex;align-items:center;gap:var(--space-1);max-width:100%;min-height:32px;padding:0 var(--space-2);border-radius:999px;background:#eef7f3;color:var(--teal);font-size:.875rem;font-weight:800;overflow-wrap:anywhere}
.mp-cat-placeholder,.photo-placeholder,.cat-photo-placeholder,.placeholder,.breed-placeholder-art{display:flex;align-items:center;justify-content:center;color:var(--muted);background:linear-gradient(135deg,#fff7f0,#e9f5ef);border:1px dashed #d8c8bd;text-align:center}
.mp-back{display:inline-flex;align-items:center;min-height:var(--touch-target);margin-bottom:var(--space-2);font-weight:800}
@media(max-width:768px){.mp-container,.mp-narrow{padding:0 var(--space-2)}.mp-section{padding:var(--space-6) 0}.mp-grid{grid-template-columns:repeat(8,minmax(0,1fr));gap:var(--space-2)}}
@media(max-width:430px){.mp-container,.mp-narrow{padding:0 var(--space-2)}.mp-section{padding:var(--space-4) 0}.mp-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--space-2)}}
`;
