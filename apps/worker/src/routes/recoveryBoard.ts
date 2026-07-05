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
  const ownerNav = isAuthenticated ? renderTopNav(lang, { authenticated: true }) : "";
  const city = url.searchParams.get("city")?.trim() || undefined;
  const ageRaw = url.searchParams.get("ageDays");
  const ageDays = ageRaw ? Number.parseInt(ageRaw, 10) : undefined;
  const validAge = Number.isSafeInteger(ageDays) && ageDays! > 0 && ageDays! <= 365 ? ageDays : undefined;
  const alerts = await listRecoveryBoardAlerts(db, city, validAge);
  const STOCK_CAT_PHOTOS = [
    "https://cdn2.thecatapi.com/images/MTY3ODIyMQ.jpg",
    "https://cdn2.thecatapi.com/images/OOD3VXAQn.jpg",
    "https://cdn2.thecatapi.com/images/ai6Jps4sx.jpg",
    "https://cdn2.thecatapi.com/images/-Zfz5z2jK.jpg",
    "https://cdn2.thecatapi.com/images/O3btzLlsO.png",
    "https://cdn2.thecatapi.com/images/0XYvRd7oD.jpg",
    "https://cdn2.thecatapi.com/images/3bkZAzhd1.jpg",
    "https://cdn2.thecatapi.com/images/dbMTzZhE_.jpg",
  ];
  const cards = alerts.length === 0
    ? `<p class="empty">${t(lang, "noMatches")}</p>`
    : alerts.map((a, i) => `<article class="card">
        ${a.photo_r2_key
          ? `<img src="/media/cats/${escapeHtml(a.public_id)}/photo" alt="${escapeHtml(a.name)}" loading="lazy" />`
          : `<img src="${STOCK_CAT_PHOTOS[i % STOCK_CAT_PHOTOS.length]}" alt="${t(lang, "noPhoto")}" loading="lazy" style="opacity:.7" />`}
        <h2>${escapeHtml(a.name)}</h2>
        <p class="badge" aria-label="${t(lang, "country")}">${escapeHtml(getCountryBadgeLabel(a.country_code))}</p>
        ${a.city ? `<p>${t(lang, "city")}: ${escapeHtml(a.city)}</p>` : ""}
        ${a.area ? `<p>${t(lang, "area")}: ${escapeHtml(a.area)}</p>` : ""}
        ${a.last_seen_at ? `<p>${t(lang, "lastSeen")}: ${escapeHtml(a.last_seen_at)}</p>` : ""}
        <div class="actions">
          <a href="/c/${escapeHtml(a.public_id)}?lang=${lang}">${t(lang, "openPublicAlert")}</a>
          <a href="/c/${escapeHtml(a.public_id)}/sighting?lang=${lang}">${t(lang, "reportSighting")}</a>
        </div>
      </article>`).join("");
  return htmlResponse(`<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${t(lang, "recoveryBoard")} — MishiPass Beta 1.5</title>
<style>${MISHIPASS_DESIGN_CSS}${TOP_NAV_CSS}body{padding:var(--space-3)}.board-shell{max-width:1184px;margin:var(--space-3) auto}.top{display:flex;justify-content:space-between;gap:var(--space-3);align-items:flex-start;flex-wrap:wrap;margin-bottom:var(--space-3)}.top>*{min-width:0}h1{font-size:clamp(2rem,6vw,3.5rem);line-height:1.08;margin:var(--space-1) 0;color:var(--teal);overflow-wrap:anywhere}.language label{display:block;font-size:.8rem;font-weight:700;margin-bottom:var(--space-1)}.filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(192px,1fr));gap:var(--space-2);margin:0 0 var(--space-4);align-items:end;padding:var(--space-3)}.filters button{width:100%}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(272px,1fr));gap:var(--space-3)}.card{border:1px solid var(--line);border-radius:8px;padding:var(--space-3);background:var(--card);min-width:0;display:flex;flex-direction:column;box-shadow:var(--shadow)}.card h2{margin:var(--space-2) 0 var(--space-1);font-size:1.25rem;color:var(--teal);overflow-wrap:anywhere}.card p{margin:var(--space-1) 0;overflow-wrap:anywhere}.card img,.placeholder{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;padding:0}.placeholder{padding:var(--space-2)}.actions{display:flex;gap:var(--space-1);flex-wrap:wrap;margin-top:auto;padding-top:var(--space-3)}.actions a{font-size:.9rem;flex:1 1 144px}.empty{padding:var(--space-3);border:1px dashed var(--line);border-radius:8px;background:#fff;overflow-wrap:anywhere}@media(max-width:430px){body{padding:var(--space-2)}.grid{grid-template-columns:1fr}.filters{grid-template-columns:1fr;padding:var(--space-2)}.actions a{flex-basis:100%}}</style></head>
<body>
  <main class="board-shell">
    ${ownerNav}
    <div class="top"><div>${brandLockupHtml(`/?lang=${lang}`)}<h1>${t(lang, "recoveryBoard")}</h1></div><div class="language">${languageSelectHtml(lang)}</div></div>
    <form class="mp-card filters" method="GET" action="/recovery-board">
      <input name="lang" type="hidden" value="${lang}" />
      <input name="city" placeholder="${t(lang, "city")}" value="${city ? escapeHtml(city) : ""}" />
      <input name="ageDays" type="number" min="1" max="365" placeholder="${t(lang, "alertAgeDays")}" value="${validAge ? String(validAge) : ""}" />
      <button class="mp-btn mp-btn-primary" type="submit">${t(lang, "filter")}</button>
    </form>
    <div class="grid">${cards}</div>
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
