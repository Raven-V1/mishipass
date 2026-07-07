import { brandLockupHtml } from "../../utils/html.js";
import { type LanguageCode, t } from "../../utils/i18n.js";
import { iconHome, iconLogout, iconSettings } from "../../utils/icons.js";

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
  const active = opts.active ?? null;
  if (opts.authenticated) {
    return `<nav class="mp-top-nav" aria-label="Owner navigation">
  <div class="mp-top-nav-brand">${brandLockupHtml(`/?lang=${lang}`)}</div>
  <div class="mp-top-nav-actions">
    <a class="mp-top-nav-link${active === "dashboard" ? " is-active" : ""}" href="/dashboard?lang=${lang}">${iconHome(16)}<span>${t(lang, "navDashboard")}</span></a>
    <a class="mp-top-nav-link${active === "settings" ? " is-active" : ""}" href="/dashboard/settings?lang=${lang}">${iconSettings(16)}<span>${t(lang, "settings")}</span></a>
    <form method="POST" action="/api/auth/logout" class="mp-top-nav-logout"><button class="mp-top-nav-link mp-top-nav-logout-btn" type="submit">${iconLogout(16)}<span>${t(lang, "navLogout")}</span></button></form>
  </div>
</nav>`;
  }
  return `<nav class="mp-top-nav" aria-label="Navigation">
  <div class="mp-top-nav-brand">${brandLockupHtml(`/?lang=${lang}`)}</div>
  <div class="mp-top-nav-actions">
    <a class="mp-top-nav-link" href="/dashboard?lang=${lang}">${iconHome(16)}<span>${t(lang, "navLogin")}</span></a>
  </div>
</nav>`;
}

export const TOP_NAV_CSS = `
.mp-top-nav{display:flex;justify-content:space-between;align-items:center;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-3);padding-bottom:var(--space-2);border-bottom:1px solid var(--line)}
.mp-top-nav-brand{display:flex;align-items:center;min-width:0}
.mp-top-nav-actions{display:flex;justify-content:flex-end;align-items:center;gap:var(--space-2);flex-wrap:wrap}
.mp-top-nav-link{display:inline-flex;align-items:center;gap:10px;min-height:var(--touch-target);padding:0 18px;border-radius:999px;background:rgba(255,253,249,.96);border:1px solid var(--line);box-shadow:0 10px 24px rgba(56,38,26,.08);color:var(--ink);font-size:.875rem;font-weight:800;text-decoration:none}
.mp-top-nav-link.is-active{background:var(--teal);border-color:var(--teal);color:#fff}
.mp-top-nav-link.is-active svg{color:#fff}
.mp-top-nav-link svg{color:var(--brand-coral);flex:0 0 auto}
.mp-top-nav-logout{margin:0}
.mp-top-nav-logout-btn{font:inherit;cursor:pointer}
@media(max-width:560px){.mp-top-nav,.mp-top-nav-actions{justify-content:flex-start}.mp-top-nav-link{padding:0 14px}}
`;
