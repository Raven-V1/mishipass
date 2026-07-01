/**
 * Vet Visit mode route handlers.
 *
 * Day 7 implementation decisions:
 * - Access is purely mode-gated (no vet token required). Known Beta limitation:
 *   anyone scanning the QR while Vet Visit is active can submit.
 * - Expiry rule: 24 hours from activation OR Save & Finish, whichever first.
 * - Save & Finish returns cat to Active Profile immediately.
 */

import { validateId } from "@mishipass/shared-validation";
import {
  findLatestVetSession,
  finishVetSession,
  insertVetSession,
  updateCatMode,
  getCatPublicProfile,
} from "../db/index.js";
import type { RequestContext } from "../middleware/session.js";
import { escapeHtml, htmlResponse } from "../utils/html.js";

// ── Constants ────────────────────────────────────────────────────────────────

const VET_SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_FIELD_LENGTH = 500;

// ── POST /api/cats/:publicId/vet-visit/start — Owner activation ─────────────

export async function handleStartVetVisit(
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

  // Switch mode — ownership enforced inside updateCatMode
  const updated = await updateCatMode(db, publicId, ctx.ownerId, "vet");
  if (!updated) {
    return new Response("Forbidden", { status: 403 });
  }

  // Create vet session record
  const now = new Date();
  const expiresAt = new Date(now.getTime() + VET_SESSION_DURATION_MS);

  await insertVetSession(db, {
    catPublicId: publicId,
    ownerId: ctx.ownerId,
    token_hash: null, // mode-gated, no token
    activated_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    status: "active",
  });

  return Response.json(
    { status: "vet_visit_active", expires_at: expiresAt.toISOString() },
    { status: 200 },
  );
}

// ── POST /api/cats/:publicId/vet-visit/cancel — Owner cancellation ──────────

export async function handleCancelVetVisit(
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

  // Return cat to active — ownership enforced inside updateCatMode
  const updated = await updateCatMode(db, publicId, ctx.ownerId, "active");
  if (!updated) {
    return new Response("Forbidden", { status: 403 });
  }

  // Mark session finished (uses owner verification internally)
  await finishVetSession(db, publicId, ctx.ownerId);

  return Response.json({ status: "returned_to_active" }, { status: 200 });
}

// ── GET /c/:publicId — Vet Visit public page ────────────────────────────────

export async function renderVetVisitPage(
  publicId: string,
  catName: string,
  countryCode: string,
  photoR2Key: string | null,
  db: D1Database,
): Promise<Response> {
  // Check for active, unexpired vet session
  const session = await findLatestVetSession(db, publicId);

  if (!session || session.status !== "active" || new Date(session.expires_at) <= new Date()) {
    // Session expired or not active — show expired page
    return htmlResponse(renderExpiredPage(catName));
  }

  // Render vet visit form
  return htmlResponse(renderVetForm(publicId, catName, countryCode, photoR2Key, session.expires_at));
}

// ── POST /api/cats/:publicId/vet-visit/finish — Public Save & Finish ────────

export async function handleVetVisitFinish(
  publicId: string,
  request: Request,
  db: D1Database,
): Promise<Response> {
  if (!validateId(publicId)) {
    return new Response("Not Found", { status: 404 });
  }

  // Load cat
  const cat = await getCatPublicProfile(db, publicId);
  if (!cat) {
    return new Response("Not Found", { status: 404 });
  }

  // Require vet mode
  if (cat.current_mode !== "vet") {
    return htmlResponse(renderNotVetModePage(cat.name), 403);
  }

  // Check active unexpired session
  const session = await findLatestVetSession(db, publicId);
  if (!session || session.status !== "active" || new Date(session.expires_at) <= new Date()) {
    return htmlResponse(renderExpiredPage(cat.name), 403);
  }

  // Parse form body
  let body: Record<string, string> = {};
  const contentType = request.headers.get("Content-Type") || "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    for (const [key, value] of params.entries()) {
      body[key] = value;
    }
  } else if (contentType.includes("application/json")) {
    try {
      const json = await request.json();
      if (typeof json === "object" && json !== null) {
        body = json as Record<string, string>;
      }
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }
  } else {
    return new Response("Unsupported Content-Type", { status: 400 });
  }

  // Validate and extract fields
  const clinicName = typeof body.clinic_name === "string" ? body.clinic_name.slice(0, MAX_FIELD_LENGTH) : null;
  const vetName = typeof body.vet_name === "string" ? body.vet_name.slice(0, MAX_FIELD_LENGTH) : null;
  const visitDate = typeof body.visit_date === "string" ? body.visit_date.slice(0, 30) : new Date().toISOString().split("T")[0]!;
  const reason = typeof body.reason === "string" ? body.reason.slice(0, MAX_FIELD_LENGTH) : null;
  const weight = typeof body.weight === "string" ? body.weight.slice(0, 30) : null;
  const notes = typeof body.notes === "string" ? body.notes.slice(0, MAX_FIELD_LENGTH) : null;

  // Compose the vet_or_clinic_name combining vet_name and clinic_name
  let vetOrClinicName: string | null = null;
  if (vetName && clinicName) {
    vetOrClinicName = `${vetName} — ${clinicName}`;
  } else if (vetName) {
    vetOrClinicName = vetName;
  } else if (clinicName) {
    vetOrClinicName = clinicName;
  }

  // Compose notes from reason, weight, and notes
  const noteParts: string[] = [];
  if (reason) noteParts.push(`Reason: ${reason}`);
  if (weight) noteParts.push(`Weight: ${weight}`);
  if (notes) noteParts.push(notes);
  const composedNotes = noteParts.length > 0 ? noteParts.join("\n") : null;

  // Save vet visit record — need to get cat internal id via a direct insert
  // Use a raw query that resolves cat_id from public_id (no owner check since
  // this is a public vet submit, and the mode gate is the access control)
  await db
    .prepare(
      `INSERT INTO vet_visits (cat_id, visit_date, vet_or_clinic_name, notes)
       VALUES ((SELECT id FROM cats WHERE public_id = ?), ?, ?, ?)`,
    )
    .bind(publicId, visitDate, vetOrClinicName, composedNotes)
    .run();

  // Mark vet session finished — use a direct query since there's no owner for public submit
  await db
    .prepare(
      `UPDATE vet_sessions
       SET status = 'finished'
       WHERE cat_id = (SELECT id FROM cats WHERE public_id = ?)
         AND status = 'active'`,
    )
    .bind(publicId)
    .run();

  // Return cat to active mode
  await db
    .prepare(`UPDATE cats SET current_mode = 'active' WHERE public_id = ?`)
    .bind(publicId)
    .run();

  return htmlResponse(renderSuccessPage(cat.name));
}

// ── HTML Renderers ──────────────────────────────────────────────────────────

function renderVetForm(
  publicId: string,
  name: string,
  countryCode: string,
  photoR2Key: string | null,
  expiresAt: string,
): string {
  const safeName = escapeHtml(name);
  const safeId = escapeHtml(publicId);
  const safeCountry = escapeHtml(countryCode);
  const safeExpiry = escapeHtml(new Date(expiresAt).toLocaleString("en-US", { timeZone: "UTC" }));

  const photoSection = photoR2Key
    ? `<div class="photo"><img src="/media/cats/${safeId}/photo" alt="${safeName}" /></div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeName} — Vet Visit — MishiPass</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:2rem auto;padding:0 1rem;color:#111;line-height:1.5}
    h1{font-size:1.5rem;margin-bottom:0.25rem}
    .badge{display:inline-block;background:#eee;padding:2px 8px;border-radius:4px;font-size:0.875rem}
    .vet-badge{background:#e0f0ff;color:#036;padding:4px 10px;border-radius:4px;font-size:0.8rem;font-weight:bold;display:inline-block;margin-bottom:1rem}
    .photo img{width:80px;height:80px;border-radius:50%;object-fit:cover;margin:0.75rem 0}
    .expiry{font-size:0.8rem;color:#666;margin-bottom:1rem}
    label{display:block;margin-bottom:0.25rem;font-size:0.875rem;font-weight:500;margin-top:0.75rem}
    input[type="text"],input[type="date"],textarea{width:100%;padding:0.5rem;border:1px solid #ccc;border-radius:4px;font-size:1rem;box-sizing:border-box}
    textarea{min-height:80px;resize:vertical}
    .submit-btn{display:block;width:100%;margin-top:1.25rem;padding:0.75rem;background:#036;color:#fff;border:none;border-radius:6px;font-size:1rem;cursor:pointer}
    .submit-btn:hover{background:#024}
    .note{font-size:0.8rem;color:#555;margin-top:1rem;padding:0.5rem;background:#f9f9f9;border-radius:4px}
  </style>
</head>
<body>
  <h1>${safeName} <span class="badge">${safeCountry}</span></h1>
  ${photoSection}
  <span class="vet-badge">🩺 Vet Visit Mode</span>
  <p class="expiry">Session expires: ${safeExpiry} UTC</p>

  <form method="POST" action="/api/cats/${safeId}/vet-visit/finish">
    <label for="clinic_name">Clinic name (optional)</label>
    <input type="text" id="clinic_name" name="clinic_name" maxlength="500" />

    <label for="vet_name">Vet name (optional)</label>
    <input type="text" id="vet_name" name="vet_name" maxlength="500" />

    <label for="visit_date">Visit date</label>
    <input type="date" id="visit_date" name="visit_date" />

    <label for="reason">Reason for visit (optional)</label>
    <input type="text" id="reason" name="reason" maxlength="500" />

    <label for="weight">Weight (optional)</label>
    <input type="text" id="weight" name="weight" maxlength="30" placeholder="e.g. 4.5 kg" />

    <label for="notes">Notes (optional)</label>
    <textarea id="notes" name="notes" maxlength="500"></textarea>

    <button type="submit" class="submit-btn">Save &amp; Finish Visit</button>
  </form>

  <p class="note">This visit record will be saved to the cat's private health history. No medical history is shown on this page. The QR will return to Active Profile after submission.</p>
</body>
</html>`;
}

function renderExpiredPage(name: string): string {
  const safeName = escapeHtml(name);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeName} — Session Expired — MishiPass</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:2rem auto;padding:0 1rem;color:#111;line-height:1.5}
    h1{font-size:1.5rem}
    .expired{background:#fff3cd;color:#856404;padding:1rem;border-radius:6px;margin:1rem 0}
  </style>
</head>
<body>
  <h1>${safeName}</h1>
  <div class="expired">
    <strong>Vet Visit session has expired or been completed.</strong>
    <p>The owner can start a new Vet Visit from their dashboard if needed.</p>
  </div>
</body>
</html>`;
}

function renderNotVetModePage(name: string): string {
  const safeName = escapeHtml(name);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeName} — MishiPass</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:2rem auto;padding:0 1rem;color:#111;line-height:1.5}
  </style>
</head>
<body>
  <h1>${safeName}</h1>
  <p>This cat is not currently in Vet Visit mode. The visit cannot be submitted.</p>
</body>
</html>`;
}

function renderSuccessPage(name: string): string {
  const safeName = escapeHtml(name);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Visit Saved — MishiPass</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:2rem auto;padding:0 1rem;color:#111;line-height:1.5}
    .success{background:#d4edda;color:#155724;padding:1rem;border-radius:6px;margin:1rem 0}
  </style>
</head>
<body>
  <h1>${safeName}</h1>
  <div class="success">
    <strong>Visit saved.</strong>
    <p>This QR has returned to Active Profile. The visit record is stored in the owner's private health history.</p>
  </div>
</body>
</html>`;
}
