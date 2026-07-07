import { brandLockupHtml } from "../../utils/html.js";
import { type LanguageCode, t } from "../../utils/i18n.js";
import { iconLogout } from "../../utils/icons.js";

export interface TopNavOptions {
  authenticated: boolean;
  active?: "dashboard" | "settings" | null;
}

/**
 * Renders a minimal utility-styled top nav bar.
 * - Authenticated: Dashboard link + Logout control.
 * - Not authenticated: Log in link.
 */
export function renderTopNav(lang: LanguageCode, opts: TopNavOptions): string {
  if (opts.authenticated) {
    return `<nav class="mp-top-nav" aria-label="Owner navigation">
  <div class="mp-top-nav-brand">${brandLockupHtml(`/?lang=${lang}`)}</div>
  <div class="mp-top-nav-actions">
    <form method="GET" class="mp-top-nav-lang-form">
      <label class="mp-top-nav-lang-label" for="mp-top-nav-language">${t(lang, "language")}</label>
      <select id="mp-top-nav-language" class="mp-top-nav-select" name="lang" onchange="this.form.submit()">
        <option value="en"${lang === "en" ? " selected" : ""}>English</option>
        <option value="es"${lang === "es" ? " selected" : ""}>Español</option>
        <option value="kk-KZ"${lang === "kk-KZ" ? " selected" : ""}>Қазақша</option>
      </select>
    </form>
    <form method="POST" action="/api/auth/logout" class="mp-top-nav-logout"><button class="mp-top-nav-link mp-top-nav-logout-btn" type="submit">${iconLogout(16)}<span>${t(lang, "navLogout")}</span></button></form>
  </div>
</nav>`;
  }
  return `<nav class="mp-top-nav" aria-label="Navigation">
  <div class="mp-top-nav-brand">${brandLockupHtml(`/?lang=${lang}`)}</div>
  <div class="mp-top-nav-actions">
    <a class="mp-top-nav-link" href="/dashboard?lang=${lang}"><span>${t(lang, "navLogin")}</span></a>
  </div>
</nav>`;
}

export const TOP_NAV_CSS = `
.mp-top-nav{display:flex;justify-content:space-between;align-items:center;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-3);padding-bottom:var(--space-2);border-bottom:1px solid var(--line)}
.mp-top-nav-brand{display:flex;align-items:center;min-width:0}
.mp-top-nav-actions{display:flex;justify-content:flex-end;align-items:center;gap:var(--space-2);flex-wrap:wrap}
.mp-top-nav-link{display:inline-flex;align-items:center;gap:10px;min-height:var(--touch-target);padding:0 18px;border-radius:999px;background:rgba(255,253,249,.96);border:1px solid var(--line);box-shadow:0 10px 24px rgba(56,38,26,.08);color:var(--ink);font-size:.875rem;font-weight:800;text-decoration:none}
.mp-top-nav-link svg{color:var(--brand-coral);flex:0 0 auto}
.mp-top-nav-lang-form{display:flex;align-items:center;gap:10px;margin:0;padding:0}
.mp-top-nav-lang-label{font-size:.75rem;font-weight:900;color:var(--muted);margin:0}
.mp-top-nav-select{min-width:152px;min-height:var(--touch-target);padding:0 14px;border-radius:999px;border:1px solid var(--line);background:rgba(255,253,249,.96);box-shadow:0 10px 24px rgba(56,38,26,.08);font:inherit;font-size:.875rem;font-weight:800;color:var(--ink)}
.mp-top-nav-logout{margin:0}
.mp-top-nav-logout-btn{font:inherit;cursor:pointer}
@media(max-width:560px){.mp-top-nav,.mp-top-nav-actions{justify-content:flex-start}.mp-top-nav-link{padding:0 14px}.mp-top-nav-lang-form{width:100%}.mp-top-nav-select{width:100%}}
`;
