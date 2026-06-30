import { generateId, validateId } from "@mishipass/shared-validation";
import {
  getCatPublicProfile,
  getContactSettingsPublic,
  getMissingAlertPublic,
  insertCat,
} from "../db/index.js";
import type { ContactSettingsPublicView, MissingAlertPublicView } from "../db/index.js";
import type { RequestContext } from "../middleware/session.js";

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
  db: D1Database
): Promise<Response> {
  // Validate format before querying D1 — don't leak whether a malformed ID
  // vs a valid-but-missing ID returns 404.
  if (!validateId(publicId)) {
    return new Response("Not Found", { status: 404 });
  }

  const cat = await getCatPublicProfile(db, publicId);
  if (!cat) {
    return new Response("Not Found", { status: 404 });
  }

  if (cat.current_mode === "missing") {
    return handlePublicMissingProfile(publicId, cat.name, db);
  }

  if (cat.current_mode !== "active") {
    return new Response(renderUnbuiltMode(cat.name), {
      status: 200,
      headers: { "Content-Type": "text/html;charset=UTF-8", "X-Content-Type-Options": "nosniff" },
    });
  }

  const contact = await getContactSettingsPublic(db, publicId);

  return new Response(
    renderActiveProfile(cat.name, cat.country_code, cat.photo_r2_key, contact),
    {
      status: 200,
      headers: { "Content-Type": "text/html;charset=UTF-8", "X-Content-Type-Options": "nosniff" },
    }
  );
}

// ── GET /c/:publicId — missing mode ─────────────────────────────────────────

async function handlePublicMissingProfile(
  publicId: string,
  catName: string,
  db: D1Database,
): Promise<Response> {
  const alert = await getMissingAlertPublic(db, publicId);
  if (!alert) {
    // Shouldn't happen if current_mode is missing, but defensive fallback.
    return new Response(renderUnbuiltMode(catName), {
      status: 200,
      headers: { "Content-Type": "text/html;charset=UTF-8", "X-Content-Type-Options": "nosniff" },
    });
  }

  return new Response(renderMissingProfile(catName, alert), {
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
  name: string,
  alert: MissingAlertPublicView,
): string {
  const safeName = escapeHtml(name);
  const safeCity = alert.city ? escapeHtml(alert.city) : null;
  const safeArea = alert.area ? escapeHtml(alert.area) : null;
  const safeLastSeen = alert.last_seen_at ? escapeHtml(alert.last_seen_at) : null;

  let rewardSection = "";
  if (alert.reward_amount !== null) {
    const safeReward = escapeHtml(alert.reward_amount);
    rewardSection = `<p class="reward">Reward: ${safeReward}</p>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeName} — Missing — MishiPass</title>
  <style>
    body { font-family: sans-serif; max-width: 480px; margin: 2rem auto; padding: 0 1rem; }
    h1 { margin-bottom: 0.25rem; }
    .status { display: inline-block; background: #fdd; color: #900; padding: 2px 8px; border-radius: 4px; font-size: 0.875rem; font-weight: bold; }
    .detail { margin: 0.5rem 0; }
    .reward { margin-top: 1rem; padding: 0.5rem; background: #ffe; border: 1px solid #cc0; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>${safeName} <span class="status">MISSING</span></h1>
  ${safeCity ? `<p class="detail">City: ${safeCity}</p>` : ""}
  ${safeArea ? `<p class="detail">Area: ${safeArea}</p>` : ""}
  ${safeLastSeen ? `<p class="detail">Last seen: ${safeLastSeen}</p>` : ""}
  ${rewardSection}
</body>
</html>`;
}

function renderActiveProfile(
  name: string,
  countryCode: string,
  photoR2Key: string | null,
  contact: ContactSettingsPublicView | null
): string {
  const safeName = escapeHtml(name);
  const safeCountry = escapeHtml(countryCode);

  const photoSection = photoR2Key
    ? `<div class="photo"><img src="/photos/${escapeHtml(photoR2Key)}" alt="${safeName}" /></div>`
    : `<div class="photo-placeholder" aria-label="No photo yet">🐱</div>`;

  let contactSection = "";
  if (contact) {
    if (contact.contact_mode === "phone" && contact.public_phone) {
      const safePhone = escapeHtml(contact.public_phone);
      contactSection = `<a class="contact-btn" href="tel:${safePhone}">📞 Call owner</a>`;
    } else if (contact.contact_mode === "relay") {
      // Relay form endpoint is built in a later task.
      contactSection = `<a class="contact-btn" href="#contact">✉️ Contact owner</a>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeName} — MishiPass</title>
  <style>
    body { font-family: sans-serif; max-width: 480px; margin: 2rem auto; padding: 0 1rem; }
    h1 { margin-bottom: 0.25rem; }
    .badge { display: inline-block; background: #eee; padding: 2px 8px; border-radius: 4px; font-size: 0.875rem; vertical-align: middle; }
    .photo img { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; display: block; margin: 1rem 0; }
    .photo-placeholder { width: 120px; height: 120px; background: #ddd; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; margin: 1rem 0; }
    .contact-btn { display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem; background: #333; color: #fff; text-decoration: none; border-radius: 6px; font-size: 1rem; }
  </style>
</head>
<body>
  <h1>${safeName} <span class="badge">${safeCountry}</span></h1>
  ${photoSection}
  ${contactSection}
</body>
</html>`;
}

function renderUnbuiltMode(name: string): string {
  const safeName = escapeHtml(name);
  return `<!DOCTYPE html>
<html lang="en">
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
