/**
 * Shared top navigation partial for authenticated pages.
 * Functional placeholder pending Zhanerke Askerbekova's design pass.
 */

import { type LanguageCode, t } from "../../utils/i18n.js";

export interface TopNavOptions {
  authenticated: boolean;
}

/**
 * Renders a minimal utility-styled top nav bar.
 * - Authenticated: Dashboard link + Logout control.
 * - Not authenticated: Log in link.
 */
export function renderTopNav(lang: LanguageCode, opts: TopNavOptions): string {
  if (opts.authenticated) {
    return `<nav class="mp-top-nav" aria-label="Owner navigation">
  <a href="/dashboard?lang=${lang}">${t(lang, "navDashboard")}</a>
  <form method="POST" action="/api/auth/logout" class="mp-top-nav-logout"><button type="submit">${t(lang, "navLogout")}</button></form>
</nav>`;
  }
  return `<nav class="mp-top-nav" aria-label="Navigation">
  <a href="/dashboard?lang=${lang}">${t(lang, "navLogin")}</a>
</nav>`;
}

/** Minimal CSS for the top nav. Include once per page. */
export const TOP_NAV_CSS = `
.mp-top-nav{display:flex;align-items:center;gap:var(--space-2,1rem);padding:var(--space-1,.5rem) 0;margin-bottom:var(--space-2,1rem);font-size:.875rem;border-bottom:1px solid var(--line,#ddd)}
.mp-top-nav a{color:var(--teal,#1a6b5c);font-weight:800;text-decoration:none}
.mp-top-nav-logout{margin:0;padding:0;display:inline}
.mp-top-nav-logout button{background:none;border:none;color:var(--muted,#666);font:inherit;font-size:.875rem;font-weight:700;cursor:pointer;padding:0}
`;
