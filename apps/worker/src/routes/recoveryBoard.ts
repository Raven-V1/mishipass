import { listRecoveryBoardAlerts, updateRecoveryBoardOptIn } from "../db/index.js";
import type { RequestContext } from "../middleware/session.js";
import { resolveSession } from "../middleware/session.js";
import { MISHIPASS_DESIGN_CSS, brandLockupHtml, escapeHtml, htmlResponse } from "../utils/html.js";
import { validateId } from "@mishipass/shared-validation";
import { getCountryBadgeLabel } from "../data/countries.js";
import { getLanguageFromRequest, LANGUAGE_SCRIPT, languageSelectHtml, t } from "../utils/i18n.js";
import { renderTopNav, TOP_NAV_CSS } from "../pages/partials/topNav.js";

export async function handleRecoveryBoardPage(request: Request, db: D1Database): Promise<Response> {
  const url = new URL(request.url);
  const lang = getLanguageFromRequest(request);
  const ctx = await resolveSession(request, db);
  const isAuthenticated = ctx.ownerId !== null;
  const ownerNav = isAuthenticated ? renderTopNav(lang, { authenticated: true, active: "dashboard" }) : "";
  const city = url.searchParams.get("city")?.trim() || undefined;
  const ageRaw = url.searchParams.get("ageDays");
  const ageDays = ageRaw ? Number.parseInt(ageRaw, 10) : undefined;
  const validAge = Number.isSafeInteger(ageDays) && ageDays! > 0 && ageDays! <= 365 ? ageDays : undefined;
  const alerts = await listRecoveryBoardAlerts(db, city, validAge);
  const boardHeader = isAuthenticated
    ? `<a class="mp-back" href="/dashboard?lang=${lang}">&larr; ${t(lang, "backToDashboard")}</a>`
    : `${brandLockupHtml(`/?lang=${lang}`)}`;
  return htmlResponse(`<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${t(lang, "recoveryBoard")} — MishiPass Beta 1.5</title>
<style>${MISHIPASS_DESIGN_CSS}${TOP_NAV_CSS}body{padding:var(--space-3)}.board-shell{max-width:1184px;margin:0 auto;padding-bottom:var(--space-6)}.page-head{display:grid;gap:var(--space-1);margin:0 0 var(--space-3)}.page-head h1{font-size:clamp(2.2rem,6vw,3.5rem);line-height:1.02;margin:0;color:var(--teal)}.page-head p{margin:0;color:var(--muted);font-weight:700}.head-row{display:flex;justify-content:space-between;gap:var(--space-3);align-items:flex-start;flex-wrap:wrap}.head-row>*{min-width:0}.filters{display:grid;grid-template-columns:1.1fr .8fr auto;gap:var(--space-2);margin:0 0 var(--space-3);align-items:end;padding:var(--space-2)}.filters button{width:100%}.sort-row{display:flex;justify-content:flex-end;gap:var(--space-2);margin:0 0 var(--space-3);flex-wrap:wrap}.sort-pill{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 var(--space-3);border-radius:12px;border:1px solid var(--line);background:rgba(255,253,249,.96);font-weight:800;color:var(--ink)}.sort-pill.is-active{background:#fff0e9;color:var(--brand-coral)}.grid{display:grid;gap:var(--space-3)}.card{display:grid;grid-template-columns:168px minmax(0,1.2fr) minmax(0,1fr) 172px;gap:var(--space-3);align-items:center;border:1px solid var(--line);border-radius:18px;padding:var(--space-2);background:var(--card);box-shadow:var(--shadow)}.card img,.placeholder{width:100%;height:120px;object-fit:cover;border-radius:14px;padding:0}.status-chip{display:inline-flex;align-items:center;gap:6px;min-height:28px;padding:0 12px;border-radius:999px;background:#fff0e9;color:var(--brand-coral);font-size:.75rem;font-weight:900}.status-chip.reviewed{background:#e8faf7;color:var(--teal)}.location-copy strong,.reporter-copy strong{display:block;color:var(--ink);font-size:1rem;margin-bottom:4px}.location-copy p,.reporter-copy p{margin:0;color:var(--muted);font-size:.875rem;font-weight:700}.meta-inline{display:flex;gap:var(--space-2);flex-wrap:wrap;margin-top:var(--space-2);color:var(--muted);font-size:.875rem;font-weight:800}.reporter-block{display:grid;grid-template-columns:auto minmax(0,1fr);gap:var(--space-2);align-items:start}.reporter-icon{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#fff7f0;border:1px solid var(--line);color:var(--muted);font-weight:900}.reporter-copy{display:grid;gap:6px}.actions{display:grid;gap:var(--space-2)}.actions a{width:100%}.actions .secondary{justify-content:center}.empty{padding:var(--space-5);text-align:center}.empty-title{font-size:1.125rem;font-weight:900;color:var(--teal);margin:0 0 var(--space-1)}.empty-copy{margin:0;color:var(--muted)}@media(max-width:980px){.filters{grid-template-columns:1fr 1fr}.filters button{grid-column:1/-1}.card{grid-template-columns:132px 1fr;align-items:start}.reporter-block,.actions{grid-column:1/-1}}@media(max-width:560px){body{padding:var(--space-2)}.card{grid-template-columns:1fr}.head-row,.sort-row{justify-content:flex-start}.sort-pill{width:100%}}</style></head>
<body>
  <main class="board-shell">
    ${ownerNav}
    <header class="page-head">
      ${boardHeader}
      <div class="head-row">
        <div>
          <h1>${t(lang, "recoveryBoard")}</h1>
          <p>${t(lang, "recoveryBoardSummary")}</p>
        </div>
        ${isAuthenticated ? "" : `<div class="language">${languageSelectHtml(lang)}</div>`}
      </div>
    </header>
    <div class="sort-row" aria-label="report sorting">
      <span class="sort-pill is-active">Newest</span>
      <span class="sort-pill">Nearest</span>
      <span class="sort-pill">Unread</span>
    </div>
    <form class="mp-card filters" method="GET" action="/recovery-board">
      <input name="lang" type="hidden" value="${lang}" />
      <input name="city" placeholder="${t(lang, "city")}" value="${city ? escapeHtml(city) : ""}" />
      <input name="ageDays" type="number" min="1" max="365" placeholder="${t(lang, "alertAgeDays")}" value="${validAge ? String(validAge) : ""}" />
      <button class="mp-btn mp-btn-primary" type="submit">${t(lang, "filter")}</button>
    </form>
    <div class="grid">${alerts.length === 0 ? `<div class="empty mp-card"><p class="empty-title">${t(lang, "noMatches")}</p><p class="empty-copy">${t(lang, "recoveryBoardSummary")}</p></div>` : alerts.map((a) => `<article class="card">
      ${a.photo_r2_key ? `<img src="/media/cats/${escapeHtml(a.public_id)}/photo" alt="${escapeHtml(a.name)}" loading="lazy" />` : `<div class="placeholder" style="background:#fff7f0;border-radius:14px;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:.875rem;font-weight:700">${t(lang, "noPhoto")}</div>`}
      <div class="location-copy">
        <span class="status-chip">Missing</span>
        <strong>${escapeHtml(a.city || t(lang, "unknown"))}${a.area ? `, ${escapeHtml(a.area)}` : ""}</strong>
        <p>${escapeHtml(a.name)}</p>
        <div class="meta-inline">
          <span>${escapeHtml(a.last_seen_at || t(lang, "unknown"))}</span>
          <span>${escapeHtml(getCountryBadgeLabel(a.country_code))}</span>
        </div>
      </div>
      <div class="reporter-block">
        <div class="reporter-icon">○</div>
        <div class="reporter-copy">
          <strong>Reporter</strong>
          <p>Anonymous</p>
          <p>${a.area ? `Seen near ${escapeHtml(a.area)}.` : t(lang, "reportSighting")}</p>
        </div>
      </div>
      <div class="actions">
        <a class="mp-btn mp-btn-primary" href="/c/${escapeHtml(a.public_id)}?lang=${lang}">${t(lang, "openPublicAlert")}</a>
        <a class="mp-btn mp-btn-secondary secondary" href="/c/${escapeHtml(a.public_id)}/sighting?lang=${lang}">${t(lang, "reportSighting")}</a>
      </div>
    </article>`).join("")}</div>
  </main>
  ${LANGUAGE_SCRIPT}
</body></html>`);
}

export async function handleRecoveryBoardOptIn(
  publicId: string,
  request: Request,
  db: D1Database,
  ctx: RequestContext,
): Promise<Response> {
  if (ctx.ownerId === null) return new Response("Unauthorized", { status: 401 });
  if (!validateId(publicId)) return new Response("Not Found", { status: 404 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const optIn = typeof body === "object" && body !== null && Boolean((body as Record<string, unknown>).recovery_board_opt_in) ? 1 : 0;
  const updated = await updateRecoveryBoardOptIn(db, publicId, ctx.ownerId, optIn);
  if (!updated) return new Response("Not Found", { status: 404 });
  return Response.json({ recovery_board_opt_in: optIn }, { status: 200 });
}
