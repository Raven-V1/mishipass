import { getCatForOwner, getContactSettingsForOwner, getMissingAlertForOwner } from "../db/index.js";
import type { RequestContext } from "../middleware/session.js";
import { escapeHtml, htmlResponse } from "../utils/html.js";
import { type LanguageCode, t } from "../utils/i18n.js";

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
<style>*{box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;max-width:660px;margin:2rem auto;padding:0 1rem;color:#111;line-height:1.5}.back{display:inline-flex;margin-bottom:.75rem}.card{border:1px solid #ddd;border-radius:8px;padding:1rem;display:grid;gap:.55rem}.photo{width:min(100%,220px);aspect-ratio:4/3;object-fit:cover;border-radius:7px;background:#eee;display:flex;align-items:center;justify-content:center;text-align:center;padding:.5rem}.share{display:inline-flex;align-items:center;justify-content:center;min-height:44px;margin-top:1rem;background:#111;color:#fff;text-decoration:none;border-radius:6px;padding:.7rem 1rem;text-align:center;line-height:1.2}.muted{color:#666;font-size:.875rem;white-space:pre-wrap;overflow-wrap:anywhere}h1,h2,p{overflow-wrap:anywhere}@media(max-width:430px){body{margin:1rem auto}.share{width:100%}}</style></head>
<body>
  <a class="back" href="/dashboard/cats/${escapeHtml(publicId)}?lang=${lang}">&larr; ${t(lang, "backToDashboard")}</a>
  <h1>${t(lang, "whatsappCard")}</h1>
  <div class="card">
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
</body></html>`;
  return htmlResponse(html);
}

function renderUnavailable(name: string, lang: LanguageCode): string {
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8" /><title>${t(lang, "whatsappCard")}</title></head><body><h1>${escapeHtml(name)}</h1><p>${t(lang, "missingAlert")}</p></body></html>`;
}
