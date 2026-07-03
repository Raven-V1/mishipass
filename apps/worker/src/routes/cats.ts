import { generateId, validateId } from "@mishipass/shared-validation";
import {
  getCatPublicProfile,
  getContactSettingsPublic,
  getMissingAlertPublic,
  insertCat,
  listCatsForOwner,
  softDeleteCat,
} from "../db/index.js";
import type { ContactSettingsPublicView, MissingAlertPublicView } from "../db/index.js";
import type { RequestContext } from "../middleware/session.js";
import { renderVetVisitPage } from "./vetVisit.js";
import { type LanguageCode, t } from "../utils/i18n.js";
import { getCountryBadgeLabel } from "../data/countries.js";
import { iconContact, iconMegaphone, iconShield } from "../utils/icons.js";
import { MISHIPASS_DESIGN_CSS, brandLockupHtml } from "../utils/html.js";

// ── GET /api/cats ───────────────────────────────────────────────────────────

export async function handleListCats(
  db: D1Database,
  publicBaseUrl: string,
  ctx: RequestContext,
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response("Unauthorized", { status: 401 });
  }

  const cats = await listCatsForOwner(db, ctx.ownerId);
  const result = cats.map((cat) => ({
    publicId: cat.public_id,
    name: cat.name,
    countryCode: cat.country_code,
    currentMode: cat.current_mode,
    qrUrl: `${publicBaseUrl}/c/${cat.public_id}`,
    hasPhoto: Boolean(cat.photo_r2_key),
    photoUrl: cat.photo_r2_key ? `/media/cats/${cat.public_id}/photo` : null,
    weight: cat.weight ?? null,
  }));

  return Response.json(result, { status: 200 });
}

// ── POST /api/cats ──────────────────────────────────────────────────────────

export async function handleCreateCat(
  request: Request,
  db: D1Database,
  publicBaseUrl: string,
  ctx: RequestContext
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>)["name"] !== "string" ||
    typeof (body as Record<string, unknown>)["countryCode"] !== "string"
  ) {
    return new Response("Body must include name (string) and countryCode (string)", {
      status: 400,
    });
  }

  const { name, countryCode } = body as { name: string; countryCode: string };

  // Extract optional expanded fields
  const b = body as Record<string, unknown>;
  const sex = typeof b["sex"] === "string" ? b["sex"].slice(0, 20) : null;
  const birthDate = typeof b["birthDate"] === "string" ? b["birthDate"].slice(0, 30) : null;
  const colorMarkings = typeof b["colorMarkings"] === "string" ? b["colorMarkings"].slice(0, 200) : null;
  const breedMix = typeof b["breedMix"] === "string" ? b["breedMix"].slice(0, 100) : null;
  const weight = typeof b["weight"] === "string" ? b["weight"].slice(0, 30) : null;
  const notes = typeof b["notes"] === "string" ? b["notes"].slice(0, 500) : null;

  let publicId: string;
  try {
    publicId = generateId(countryCode);
  } catch {
    return new Response("Invalid countryCode", { status: 400 });
  }

  // Retry on UNIQUE constraint collision — up to 5 attempts.
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) publicId = generateId(countryCode);
    try {
      await insertCat(db, {
        public_id: publicId,
        owner_id: ctx.ownerId,
        name,
        country_code: countryCode,
        photo_r2_key: null,
        current_mode: "active",
        sex,
        birth_date: birthDate,
        color_markings: colorMarkings,
        breed_mix: breedMix,
        weight,
        notes,
      });
      const qrUrl = `${publicBaseUrl}/c/${publicId}`;
      return Response.json({ publicId, qrUrl }, { status: 201 });
    } catch (err) {
      // Known limitation: D1 does not expose structured error codes, so we
      // match on error message substrings. If D1's wording changes, this may
      // need updating — acceptable trade-off for a hackathon timeline.
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      const isUniqueViolation =
        msg.includes("unique") || msg.includes("constraint failed");
      if (!isUniqueViolation) {
        return new Response("Internal error", { status: 500 });
      }
      // Unique collision — retry with a fresh ID.
    }
  }

  return new Response("Could not generate a unique ID after 5 attempts", {
    status: 500,
  });
}

// ── GET /c/:publicId ────────────────────────────────────────────────────────

export async function handlePublicProfile(
  publicId: string,
  db: D1Database,
  lang: LanguageCode = "en",
): Promise<Response> {
  // Validate format before querying D1 — don't leak whether a malformed ID
  // vs a valid-but-missing ID returns 404.
  const cat = await getCatPublicProfile(db, publicId);
  if (!cat) {
    return new Response("Not Found", { status: 404 });
  }

  if (cat.current_mode === "missing") {
    return handlePublicMissingProfile(publicId, cat, db, lang);
  }

  if (cat.current_mode === "vet") {
    return renderVetVisitPage(publicId, cat.name, cat.country_code, cat.photo_r2_key, db, lang);
  }

  if (cat.current_mode !== "active") {
    return new Response(renderUnbuiltMode(cat.name), {
      status: 200,
      headers: { "Content-Type": "text/html;charset=UTF-8", "X-Content-Type-Options": "nosniff" },
    });
  }

  const contact = await getContactSettingsPublic(db, publicId);
  const effectiveContact = contact ?? { contact_mode: "relay" as const, public_phone: null };

  return new Response(
    renderActiveProfile(publicId, cat.name, cat.country_code, cat.photo_r2_key, effectiveContact, {
      sex: cat.sex,
      color_markings: cat.color_markings,
      breed_mix: cat.breed_mix,
      weight: cat.weight,
    }, lang),
    {
      status: 200,
      headers: { "Content-Type": "text/html;charset=UTF-8", "X-Content-Type-Options": "nosniff" },
    }
  );
}

// ── GET /c/:publicId — missing mode ─────────────────────────────────────────

async function handlePublicMissingProfile(
  publicId: string,
  cat: NonNullable<Awaited<ReturnType<typeof getCatPublicProfile>>>,
  db: D1Database,
  lang: LanguageCode,
): Promise<Response> {
  const alert = await getMissingAlertPublic(db, publicId);
  if (!alert) {
    // Shouldn't happen if current_mode is missing, but defensive fallback.
    return new Response(renderUnbuiltMode(cat.name, lang), {
      status: 200,
      headers: { "Content-Type": "text/html;charset=UTF-8", "X-Content-Type-Options": "nosniff" },
    });
  }
  const contact = await getContactSettingsPublic(db, publicId);

  return new Response(renderMissingProfile(cat, alert, contact ?? { contact_mode: "relay", public_phone: null }, publicId, lang), {
    status: 200,
    headers: { "Content-Type": "text/html;charset=UTF-8", "X-Content-Type-Options": "nosniff" },
  });
}

// ── HTML renderers ──────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMissingProfile(
  cat: NonNullable<Awaited<ReturnType<typeof getCatPublicProfile>>>,
  alert: MissingAlertPublicView,
  contact: ContactSettingsPublicView,
  publicId?: string,
  lang: LanguageCode = "en",
): string {
  const safeName = escapeHtml(cat.name);
  const safeId = publicId ? escapeHtml(publicId) : "";
  const safeCountry = escapeHtml(getCountryBadgeLabel(cat.country_code));
  const safeCity = alert.city ? escapeHtml(alert.city) : null;
  const safeArea = alert.area ? escapeHtml(alert.area) : null;
  const safeLastSeen = alert.last_seen_at ? escapeHtml(alert.last_seen_at) : null;
  const contactValue = contact.contact_mode === "phone" && contact.public_phone
    ? escapeHtml(contact.public_phone)
    : t(lang, "contactThroughMishipass");
  const photoSection = cat.photo_r2_key && publicId
    ? `<img class="alert-photo" src="/media/cats/${safeId}/photo" alt="${safeName}" />`
    : `<div class="alert-photo photo-placeholder">${t(lang, "noPhoto")}</div>`;

  let rewardSection = "";
  if (alert.reward_amount !== null) {
    const safeReward = escapeHtml(alert.reward_amount);
    rewardSection = safeReward;
  }

  const sightingLink = publicId
    ? `<p class="sighting-link"><a class="mp-btn mp-btn-primary" href="/c/${safeId}/sighting?lang=${lang}">${t(lang, "reportSighting")}</a></p>`
    : "";

  const rows = [
    [t(lang, "city"), safeCity || t(lang, "unknown")],
    [t(lang, "area"), safeArea || t(lang, "unknown")],
    ...(rewardSection ? [[t(lang, "reward"), rewardSection]] : []),
    [t(lang, "lastSeen"), safeLastSeen || t(lang, "unknown")],
    [t(lang, "breedMix"), cat.breed_mix ? escapeHtml(cat.breed_mix) : t(lang, "unknown")],
    [t(lang, "colorMarkings"), cat.color_markings ? escapeHtml(cat.color_markings) : t(lang, "unknown")],
    ["Age", cat.birth_date ? escapeHtml(cat.birth_date) : t(lang, "unknown")],
    [t(lang, "sex"), cat.sex ? escapeHtml(cat.sex) : t(lang, "unknown")],
    ["Microchip ID", "Not available"],
    [t(lang, "contact"), contactValue],
    [t(lang, "openPublicAlert"), publicId ? `<a href="/c/${safeId}?lang=${lang}">/c/${safeId}</a>` : t(lang, "unknown")],
  ].map(([label, value]) => `<div class="data-row"><dt>${label}</dt><dd>${value}</dd></div>`).join("");

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeName} — ${t(lang, "missing")} — MishiPass</title>
  <style>
    ${MISHIPASS_DESIGN_CSS}
    body{padding:var(--space-3)}
    .alert-shell{max-width:960px;margin:0 auto;padding:var(--space-3) 0 var(--space-6)}
    .alert-head{text-align:center;margin:var(--space-3) auto}
    .alert-card{display:grid;grid-template-columns:minmax(280px,336px) minmax(0,1fr);gap:var(--space-4);padding:var(--space-4)}
    h1{display:flex;align-items:center;justify-content:center;gap:var(--space-1);font-size:clamp(2rem,6vw,3.5rem);line-height:1.08;margin:0 0 var(--space-1);color:var(--teal);overflow-wrap:anywhere}
    .alert-subtitle{margin:0;color:var(--muted);font-weight:700}
    .alert-pills{display:flex;align-items:center;gap:var(--space-1);flex-wrap:wrap;margin:0 0 var(--space-2)}
    .status{background:#fff0e9;color:#b42318}
    .alert-photo{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;background:#fff7f0}
    .photo-placeholder{min-height:252px;font-weight:800}
    .alert-copy h2{font-size:2rem;line-height:1.08;color:var(--teal);margin:0 0 var(--space-2)}
    .data-list{display:grid;gap:var(--space-1);margin:0}
    .data-row{display:grid;grid-template-columns:minmax(120px,180px) minmax(0,1fr);gap:var(--space-2);padding:var(--space-1) 0;border-bottom:1px solid var(--line)}
    .data-row dt{font-weight:900;color:var(--teal)}
    .data-row dd{margin:0;overflow-wrap:anywhere}
    .privacy-note{display:flex;align-items:center;gap:var(--space-1);color:var(--muted);margin:var(--space-2) 0 0}
    @media(max-width:700px){body{padding:var(--space-2)}.alert-shell{padding:var(--space-2) 0 var(--space-4)}.alert-card{grid-template-columns:1fr;padding:var(--space-3)}.data-row{grid-template-columns:1fr;gap:0}.sighting-link .mp-btn{width:100%}}
  </style>
</head>
<body>
  <main class="alert-shell">
    ${brandLockupHtml(`/?lang=${lang}`)}
    <header class="alert-head">
      <h1>${iconMegaphone(32)} <span>${t(lang, "missingAlert")}</span></h1>
      <p class="alert-subtitle">Help reunite your furry friend safely.</p>
    </header>
    <section class="mp-card alert-card">
      <div>${photoSection}${sightingLink}</div>
      <div class="alert-copy">
        <p class="alert-pills"><span class="badge">${safeCountry}</span><span class="status">${t(lang, "missing")}</span></p>
        <h2>${safeName}</h2>
        <dl class="data-list">${rows}</dl>
        <p class="privacy-note">${iconShield(16)} <span>No private cartilla or medical data is shown.</span></p>
      </div>
    </section>
  </main>
</body>
</html>`;
}

function renderActiveProfile(
  publicId: string,
  name: string,
  countryCode: string,
  photoR2Key: string | null,
  contact: ContactSettingsPublicView,
  catView: { sex: string | null; color_markings: string | null; breed_mix: string | null; weight: string | null },
  lang: LanguageCode = "en",
): string {
  const safeName = escapeHtml(name);
  const safeCountry = escapeHtml(getCountryBadgeLabel(countryCode));

  const photoSection = photoR2Key
    ? `<div class="photo"><img src="/media/cats/${escapeHtml(publicId)}/photo" alt="${safeName}" /></div>`
    : `<div class="photo-placeholder" aria-label="${t(lang, "noPhoto")}"></div>`;

  let contactSection = "";
  if (contact.contact_mode === "phone" && contact.public_phone) {
    const safePhone = escapeHtml(contact.public_phone);
    contactSection = `<a class="contact-btn" href="tel:${safePhone}">${t(lang, "callOwner")}</a>`;
  } else if (contact.contact_mode === "relay") {
    contactSection = `<p class="contact-info">${t(lang, "contactOwner")}</p>`;
  }

  // Expanded fields
  let detailLines = "";
  if (catView.sex) {
    detailLines += `<p class="detail">${t(lang, "sex")}: ${escapeHtml(catView.sex)}</p>`;
  }
  if (catView.color_markings) {
    detailLines += `<p class="detail">${t(lang, "colorMarkings")}: ${escapeHtml(catView.color_markings)}</p>`;
  }
  if (catView.breed_mix) {
    detailLines += `<p class="detail">${t(lang, "breedMix")}: ${escapeHtml(catView.breed_mix)}</p>`;
  }
  if (catView.weight) {
    detailLines += `<p class="detail">${t(lang, "weight")}: ${escapeHtml(catView.weight)}</p>`;
  }

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeName} — MishiPass</title>
  <style>
    ${MISHIPASS_DESIGN_CSS}
    body{padding:var(--space-3)}
    .profile-shell{max-width:704px;margin:var(--space-4) auto}
    .profile-card{padding:var(--space-4)}
    h1{font-size:clamp(2rem,6vw,3rem);line-height:1.08;margin:var(--space-3) 0 var(--space-1);color:var(--teal);overflow-wrap:anywhere}
    .photo img,.photo-placeholder{width:160px;height:160px;border-radius:8px;object-fit:cover;display:flex;align-items:center;justify-content:center;margin:var(--space-3) 0;background:#fff7f0}
    .detail{margin:var(--space-1) 0;color:var(--ink)}
    .contact-info{display:flex;align-items:center;gap:var(--space-1);margin-top:var(--space-3);color:var(--muted)}
    @media(max-width:430px){body{padding:var(--space-2)}.profile-card{padding:var(--space-3)}.contact-btn{width:100%}}
  </style>
</head>
<body>
  <main class="profile-shell">
    ${brandLockupHtml(`/?lang=${lang}`)}
    <section class="mp-card profile-card">
      <h1>${safeName}</h1>
      <span class="badge">${safeCountry}</span>
      ${photoSection}
      ${detailLines}
      ${contactSection || `<p class="contact-info">${iconContact(16)} <span>${t(lang, "privacyOwnerControlledContact")}</span></p>`}
    </section>
  </main>
</body>
</html>`;
}

function renderUnbuiltMode(name: string, lang: LanguageCode = "en"): string {
  const safeName = escapeHtml(name);
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeName} — MishiPass</title>
  <style>body { font-family: sans-serif; max-width: 480px; margin: 2rem auto; padding: 0 1rem; }</style>
</head>
<body>
  <h1>${safeName}</h1>
  <p>This cat's current mode isn't available yet. Check back soon.</p>
</body>
</html>`;
}

// ── POST /api/cats/:publicId/remove ─────────────────────────────────────────

export async function handleRemoveCat(
  publicId: string,
  db: D1Database,
  ctx: RequestContext,
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!validateId(publicId)) {
    return new Response("Not Found", { status: 404 });
  }

  const removed = await softDeleteCat(db, publicId, ctx.ownerId);
  if (!removed) {
    return new Response("Forbidden", { status: 403 });
  }

  return Response.json({ status: "removed" }, { status: 200 });
}
