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
  const safeName = escapeHtml(cat.name);
  const shareLines = [
    `${cat.name} is missing.`,
    alert.city ? `City: ${alert.city}` : "",
    alert.area ? `Area: ${alert.area}` : "",
    alert.last_seen_at ? `Missing since: ${alert.last_seen_at}` : "",
    alert.reward_visible === 1 && alert.reward_amount ? `Reward: ${alert.reward_amount}` : "",
    contact?.contact_mode === "phone" && contact.public_phone ? `Contact: ${contact.public_phone}` : "Contact through MishiPass",
    `${publicLink}?lang=${lang}`,
  ].filter(Boolean).join("\n");

  const photo = cat.photo_r2_key
    ? `<img class="photo" src="/media/cats/${escapeHtml(publicId)}/photo" alt="${safeName}" />`
    : `<div class="photo placeholder">${t(lang, "noPhoto")}</div>`;
  const reward = alert.reward_visible === 1 && alert.reward_amount
    ? `<p><strong>Reward:</strong> ${escapeHtml(alert.reward_amount)}</p>`
    : "";
  const contactHtml = contact?.contact_mode === "phone" && contact.public_phone
    ? `<p><strong>Contact:</strong> ${escapeHtml(contact.public_phone)}</p>`
    : `<p><strong>Contact:</strong> through MishiPass</p>`;
  const html = `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${t(lang, "whatsappCard")} — ${safeName}</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;max-width:620px;margin:2rem auto;padding:0 1rem;color:#111;line-height:1.5}.card{border:1px solid #ddd;border-radius:6px;padding:1rem}.photo{width:180px;height:140px;object-fit:cover;border-radius:6px;background:#eee;display:flex;align-items:center;justify-content:center}.share{display:inline-block;margin-top:1rem;background:#111;color:#fff;text-decoration:none;border-radius:4px;padding:0.65rem 1rem}.muted{color:#666;font-size:0.875rem;white-space:pre-wrap}</style></head>
<body>
  <p><a href="/dashboard/cats/${escapeHtml(publicId)}?lang=${lang}">&larr; ${safeName}</a></p>
  <h1>${t(lang, "whatsappCard")}</h1>
  <div class="card">
    ${photo}
    <h2>${safeName} ${t(lang, "missing")}</h2>
    ${alert.city ? `<p><strong>${t(lang, "city")}:</strong> ${escapeHtml(alert.city)}</p>` : ""}
    ${alert.area ? `<p><strong>${t(lang, "area")}:</strong> ${escapeHtml(alert.area)}</p>` : ""}
    ${alert.last_seen_at ? `<p><strong>Missing since:</strong> ${escapeHtml(alert.last_seen_at)}</p>` : ""}
    ${reward}
    ${contactHtml}
    <p><strong>${t(lang, "openPublicAlert")}:</strong> <a href="/c/${escapeHtml(publicId)}?lang=${lang}">${escapeHtml(publicLink)}</a></p>
  </div>
  <a class="share" href="https://wa.me/?text=${encodeURIComponent(shareLines)}" rel="noopener">Share on WhatsApp</a>
  <p class="muted">${escapeHtml(shareLines)}</p>
</body></html>`;
  return htmlResponse(html);
}

function renderUnavailable(name: string, lang: LanguageCode): string {
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8" /><title>${t(lang, "whatsappCard")}</title></head><body><h1>${escapeHtml(name)}</h1><p>${t(lang, "missingAlert")}</p></body></html>`;
}
