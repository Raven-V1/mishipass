import { getCatForOwner, getContactSettingsForOwner, getMissingAlertForOwner } from "../db/index.js";
import type { RequestContext } from "../middleware/session.js";
import { MISHIPASS_DESIGN_CSS, escapeHtml, htmlResponse } from "../utils/html.js";
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
  const html = `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${t(lang, "whatsappCard")} — ${safeName}</title>
<style>${MISHIPASS_DESIGN_CSS}${TOP_NAV_CSS}body{padding:var(--space-3)}.missing-card-shell{max-width:1080px;margin:var(--space-3) auto;padding-bottom:var(--space-6)}.back{margin-bottom:var(--space-2)}.hero{display:grid;gap:var(--space-1);margin-bottom:var(--space-3)}.hero h1{color:var(--teal);font-size:clamp(2rem,6vw,3.25rem);line-height:1.04;margin:var(--space-1) 0}.hero p{margin:0;color:var(--muted);font-weight:700}.card{padding:var(--space-4);display:grid;grid-template-columns:minmax(280px,360px) minmax(0,1fr);gap:var(--space-4);align-items:start}.photo-wrap{display:grid;gap:var(--space-2)}.photo{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;background:#fff7f0;display:flex;align-items:center;justify-content:center;text-align:center;padding:var(--space-2)}.alert-note{padding:var(--space-2);border:1px solid #f1c3b2;border-radius:8px;background:#fff2ec;color:#8a3b21;font-weight:800}.copy h2{margin:0 0 var(--space-1);font-size:2rem;color:var(--teal)}.summary-band{display:flex;gap:var(--space-2);flex-wrap:wrap;margin:0 0 var(--space-2)}.summary-pill{display:inline-flex;align-items:center;min-height:40px;padding:0 var(--space-2);border-radius:999px;background:#fff7f0;border:1px solid var(--line);font-size:.875rem;font-weight:800;color:var(--ink)}.detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-2);margin-top:var(--space-2)}.detail-card{padding:var(--space-2);border:1px solid var(--line);border-radius:8px;background:#fffaf6}.detail-card strong{display:block;font-size:.75rem;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);margin-bottom:6px}.detail-card span,.detail-card a{font-size:1rem;font-weight:800;color:var(--ink);overflow-wrap:anywhere}.share-strip{display:grid;grid-template-columns:auto minmax(0,1fr);gap:var(--space-2);margin-top:var(--space-3);align-items:start}.share{margin-top:0;min-height:52px}.share-preview{background:#fffaf6;border:1px solid var(--line);border-radius:8px;padding:var(--space-2)}.muted{font-size:.875rem;white-space:pre-wrap;overflow-wrap:anywhere;margin:0}.label{display:block;font-size:.75rem;font-weight:900;color:var(--muted);margin-bottom:var(--space-1)}h1,h2,p{overflow-wrap:anywhere}@media(max-width:860px){.card,.detail-grid,.share-strip{grid-template-columns:1fr}}@media(max-width:430px){body{padding:var(--space-2)}.share{width:100%}}</style></head>
<body>
  <main class="missing-card-shell">
    ${renderTopNav(lang, { authenticated: true, active: "dashboard" })}
    <a class="mp-back back" href="/dashboard/cats/${escapeHtml(publicId)}?lang=${lang}">&larr; ${t(lang, "backToDashboard")}</a>
    <div class="hero"><h1>${t(lang, "whatsappCard")}</h1><p>${t(lang, "openPublicAlert")}</p></div>
    <div class="mp-card card">
      <div class="photo-wrap">${photo}<div class="alert-note">${t(lang, "missingAlert")} active. Share this card from the owner dashboard without opening a new tab.</div></div>
      <div class="copy">
        <span class="badge">${t(lang, "missing")}</span>
        <h2>${safeName}</h2>
        <div class="summary-band">
          <span class="summary-pill">${t(lang, "missing")}</span>
          ${alert.reward_visible === 1 && alert.reward_amount ? `<span class="summary-pill">${t(lang, "reward")}: ${escapeHtml(alert.reward_amount)}</span>` : ""}
        </div>
        <div class="detail-grid">
          ${alert.city ? `<div class="detail-card"><strong>${t(lang, "city")}</strong><span>${escapeHtml(alert.city)}</span></div>` : ""}
          ${alert.area ? `<div class="detail-card"><strong>${t(lang, "area")}</strong><span>${escapeHtml(alert.area)}</span></div>` : ""}
          ${alert.last_seen_at ? `<div class="detail-card"><strong>${t(lang, "missingSince")}</strong><span>${escapeHtml(alert.last_seen_at)}</span></div>` : ""}
          ${alert.reward_visible === 1 && alert.reward_amount ? `<div class="detail-card"><strong>${t(lang, "reward")}</strong><span>${escapeHtml(alert.reward_amount)}</span></div>` : ""}
          <div class="detail-card"><strong>${t(lang, "contact")}</strong><span>${contact?.contact_mode === "phone" && contact.public_phone ? escapeHtml(contact.public_phone) : t(lang, "contactThroughMishipass")}</span></div>
          <div class="detail-card" style="grid-column:1/-1"><strong>${t(lang, "openPublicAlert")}</strong><a href="/c/${escapeHtml(publicId)}?lang=${lang}">${escapeHtml(publicAlertUrl)}</a></div>
        </div>
      </div>
    </div>
    <div class="share-strip">
      <a class="share mp-btn mp-btn-primary" href="https://wa.me/?text=${encodeURIComponent(shareLines)}" rel="noopener">${t(lang, "shareOnWhatsapp")}</a>
      <div class="share-preview"><span class="label">${t(lang, "whatsappCard")}</span><p class="muted">${escapeHtml(shareLines)}</p></div>
    </div>
  </main>
</body></html>`;
  return htmlResponse(html);
}

function renderUnavailable(name: string, lang: LanguageCode): string {
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8" /><title>${t(lang, "whatsappCard")}</title></head><body><h1>${escapeHtml(name)}</h1><p>${t(lang, "missingAlert")}</p></body></html>`;
}
