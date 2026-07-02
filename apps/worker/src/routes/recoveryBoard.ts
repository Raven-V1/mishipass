import { listRecoveryBoardAlerts, updateRecoveryBoardOptIn } from "../db/index.js";
import type { RequestContext } from "../middleware/session.js";
import { escapeHtml, htmlResponse } from "../utils/html.js";
import { validateId } from "@mishipass/shared-validation";
import { getCountryBadgeLabel } from "../data/countries.js";
import { getLanguageFromRequest, LANGUAGE_SCRIPT, languageSelectHtml, t } from "../utils/i18n.js";

export async function handleRecoveryBoardPage(request: Request, db: D1Database): Promise<Response> {
  const url = new URL(request.url);
  const lang = getLanguageFromRequest(request);
  const city = url.searchParams.get("city")?.trim() || undefined;
  const ageRaw = url.searchParams.get("ageDays");
  const ageDays = ageRaw ? Number.parseInt(ageRaw, 10) : undefined;
  const validAge = Number.isSafeInteger(ageDays) && ageDays! > 0 && ageDays! <= 365 ? ageDays : undefined;
  const alerts = await listRecoveryBoardAlerts(db, city, validAge);
  const cards = alerts.length === 0
    ? `<p class="empty">${t(lang, "noMatches")}</p>`
    : alerts.map(a => `<article class="card">
        ${a.photo_r2_key ? `<img src="/media/cats/${escapeHtml(a.public_id)}/photo" alt="${escapeHtml(a.name)}" loading="lazy" />` : `<div class="placeholder">${t(lang, "noPhoto")}</div>`}
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
<style>*{box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;max-width:1040px;margin:2rem auto;padding:0 1rem;color:#111;line-height:1.5}.top{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap}.language label{display:block;font-size:.8rem;font-weight:700;margin-bottom:.2rem}.language select,input{padding:.6rem;border:1px solid #cfcfcf;border-radius:6px}.filters{display:flex;gap:.6rem;flex-wrap:wrap;margin:1rem 0 1.25rem}.filters>*{min-height:42px}button,.actions a{border:0;border-radius:6px;background:#111;color:#fff;padding:.6rem .9rem;text-decoration:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;min-height:42px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:1rem}.card{border:1px solid #ddd;border-radius:8px;padding:1rem;background:#fff;min-width:0}.card h2{margin:.7rem 0 .35rem;font-size:1.05rem;overflow-wrap:anywhere}.card p{margin:.3rem 0}.card img,.placeholder{width:100%;aspect-ratio:4/3;object-fit:cover;background:#eee;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#666;text-align:center;padding:.5rem}.badge{display:inline-block;background:#f1f1f1;border-radius:999px;padding:.15rem .55rem;font-size:.85rem}.actions{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.8rem}.actions a{font-size:.9rem}.empty{padding:1rem;border:1px dashed #bbb;border-radius:8px;background:#fafafa}@media(max-width:430px){body{margin:1rem auto}.filters input,.filters button{width:100%}}</style></head>
<body>
  <div class="top"><div><a href="/?lang=${lang}">${t(lang, "home")}</a><h1>${t(lang, "recoveryBoard")}</h1></div><div class="language">${languageSelectHtml(lang)}</div></div>
  <form class="filters" method="GET" action="/recovery-board">
    <input name="lang" type="hidden" value="${lang}" />
    <input name="city" placeholder="${t(lang, "city")}" value="${city ? escapeHtml(city) : ""}" />
    <input name="ageDays" type="number" min="1" max="365" placeholder="${t(lang, "alertAgeDays")}" value="${validAge ? String(validAge) : ""}" />
    <button type="submit">${t(lang, "filter")}</button>
  </form>
  <div class="grid">${cards}</div>
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
