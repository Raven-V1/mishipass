import { getCatForOwner, getContactSettingsForOwner, getMissingAlertForOwner } from "../db/index.js";
import type { RequestContext } from "../middleware/session.js";
import { MISHIPASS_DESIGN_CSS, brandLockupHtml, escapeHtml, htmlResponse } from "../utils/html.js";
import { type LanguageCode, t } from "../utils/i18n.js";
import { renderTopNav, TOP_NAV_CSS } from "../pages/partials/topNav.js";

export async function handleMissingCardPage(
  publicId: string,
  db: D1Database,
  ctx: RequestContext,
  publicBaseUrl: string,
  lang: LanguageCode = "en",
): Promise<Response> {
  if (ctx.ownerId === null) return new Response(null, { status: 302, headers: { Location: "/dashboard" } });
  const cat = await getCatForOwner(db, publicId, ctx.ownerId);
  if (!cat) return new Response("Not Found", { status: 404 });
  if (cat.current_mode !== "missing") {
    return htmlResponse(renderUnavailable(cat.name, lang), 409);
  }

  const alert = await getMissingAlertForOwner(db, publicId, ctx.ownerId);
  if (!alert) return htmlResponse(renderUnavailable(cat.name, lang), 404);
  const contact = await getContactSettingsForOwner(db, publicId, ctx.ownerId);
  const publicLink = `${publicBaseUrl}/c/${publicId}`;
  const publicAlertUrl = `${publicLink}?lang=${encodeURIComponent(lang)}`;
  const safeName = escapeHtml(cat.name);
  const shareLines = [
    `${cat.name} ${t(lang, "whatsappShareMissing")}`,
    alert.city ? `${t(lang, "city")}: ${alert.city}` : "",
    alert.area ? `${t(lang, "area")}: ${alert.area}` : "",
    alert.last_seen_at ? `${t(lang, "missingSince")}: ${alert.last_seen_at}` : "",
    alert.reward_visible === 1 && alert.reward_amount ? `${t(lang, "reward")}: ${alert.reward_amount}` : "",
    contact?.contact_mode === "phone" && contact.public_phone ? `${t(lang, "contact")}: ${contact.public_phone}` : t(lang, "contactThroughMishipass"),
    publicAlertUrl,
  ].filter(Boolean).join("\n");

  const photo = cat.photo_r2_key
    ? `<img class="photo" src="/media/cats/${escapeHtml(publicId)}/photo" alt="${safeName}" />`
    : `<div class="photo placeholder">${t(lang, "noPhoto")}</div>`;
  const reward = alert.reward_visible === 1 && alert.reward_amount
    ? `<p><strong>${t(lang, "reward")}:</strong> ${escapeHtml(alert.reward_amount)}</p>`
    : "";
  const contactHtml = contact?.contact_mode === "phone" && contact.public_phone
    ? `<p><strong>${t(lang, "contact")}:</strong> ${escapeHtml(contact.public_phone)}</p>`
    : `<p><strong>${t(lang, "contact")}:</strong> ${t(lang, "contactThroughMishipass")}</p>`;
  const html = `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${t(lang, "whatsappCard")} — ${safeName}</title>
<style>${MISHIPASS_DESIGN_CSS}${TOP_NAV_CSS}body{padding:var(--space-3)}.missing-card-shell{max-width:704px;margin:var(--space-4) auto}.back{margin-bottom:var(--space-2)}h1{color:var(--teal);font-size:clamp(2rem,6vw,3rem);line-height:1.08}.card{padding:var(--space-3);display:grid;gap:var(--space-2)}.photo{width:min(100%,320px);aspect-ratio:4/3;object-fit:cover;border-radius:8px;background:#fff7f0;display:flex;align-items:center;justify-content:center;text-align:center;padding:var(--space-2)}.share{margin-top:var(--space-3)}.muted{font-size:.875rem;white-space:pre-wrap;overflow-wrap:anywhere;margin-top:var(--space-2)}h1,h2,p{overflow-wrap:anywhere}@media(max-width:430px){body{padding:var(--space-2)}.share{width:100%}}</style></head>
<body>
  <main class="missing-card-shell">
    ${renderTopNav(lang, { authenticated: true })}
    ${brandLockupHtml(`/?lang=${lang}`)}
    <a class="mp-back back" href="/dashboard/cats/${escapeHtml(publicId)}?lang=${lang}">&larr; ${t(lang, "backToDashboard")}</a>
    <h1>${t(lang, "whatsappCard")}</h1>
    <div class="mp-card card">
      ${photo}
      <h2>${safeName} ${t(lang, "missing")}</h2>
      ${alert.city ? `<p><strong>${t(lang, "city")}:</strong> ${escapeHtml(alert.city)}</p>` : ""}
      ${alert.area ? `<p><strong>${t(lang, "area")}:</strong> ${escapeHtml(alert.area)}</p>` : ""}
      ${alert.last_seen_at ? `<p><strong>${t(lang, "missingSince")}:</strong> ${escapeHtml(alert.last_seen_at)}</p>` : ""}
      ${reward}
      ${contactHtml}
      <p><strong>${t(lang, "openPublicAlert")}:</strong> <a href="/c/${escapeHtml(publicId)}?lang=${lang}">${escapeHtml(publicAlertUrl)}</a></p>
    </div>
    <a class="share" href="https://wa.me/?text=${encodeURIComponent(shareLines)}" rel="noopener">${t(lang, "shareOnWhatsapp")}</a>
    <p class="muted">${escapeHtml(shareLines)}</p>
  </main>
</body></html>`;
  return htmlResponse(html);
}

function renderUnavailable(name: string, lang: LanguageCode): string {
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8" /><title>${t(lang, "whatsappCard")}</title></head><body><h1>${escapeHtml(name)}</h1><p>${t(lang, "missingAlert")}</p></body></html>`;
}
