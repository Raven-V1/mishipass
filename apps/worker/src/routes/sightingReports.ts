import { validateId } from "@mishipass/shared-validation";
import {
  getCatPublicProfile,
  insertSightingReport,
  listSightingReportsForOwner,
} from "../db/index.js";
import type { RequestContext } from "../middleware/session.js";
import { checkRateLimit } from "../middleware/rateLimit.js";
import { sha256Hex } from "../utils/crypto.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── GET /c/:publicId/sighting ───────────────────────────────────────────────

export async function handleSightingForm(
  publicId: string,
  db: D1Database,
): Promise<Response> {
  if (!validateId(publicId)) {
    return new Response("Not Found", { status: 404 });
  }

  const cat = await getCatPublicProfile(db, publicId);
  if (!cat) {
    return new Response("Not Found", { status: 404 });
  }

  if (cat.current_mode !== "missing") {
    return new Response(
      renderNotAcceptingPage(),
      {
        status: 200,
        headers: {
          "Content-Type": "text/html;charset=UTF-8",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }

  return new Response(
    renderSightingForm(publicId, cat.name),
    {
      status: 200,
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

// ── POST /c/:publicId/sighting ──────────────────────────────────────────────

export async function handleSightingSubmit(
  publicId: string,
  request: Request,
  db: D1Database,
): Promise<Response> {
  if (!validateId(publicId)) {
    return new Response("Not Found", { status: 404 });
  }

  const cat = await getCatPublicProfile(db, publicId);
  if (!cat) {
    return new Response("Not Found", { status: 404 });
  }

  if (cat.current_mode !== "missing") {
    return Response.json({ error: "Not accepting reports" }, { status: 400 });
  }

  // Rate limiting: 5 submissions per 10 minutes per IP+publicId
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const rateLimitKey = `${ip}:${publicId}`;
  if (!checkRateLimit(rateLimitKey, 5, 10 * 60 * 1000)) {
    return Response.json(
      { error: "Too many reports. Try again later." },
      { status: 429 },
    );
  }

  // Parse body (form-urlencoded or JSON)
  let city = "";
  let area = "";
  let sightedAt = "";
  let message = "";
  let reporterName = "";
  let reporterContact = "";

  const contentType = request.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }
    if (typeof body === "object" && body !== null) {
      const b = body as Record<string, unknown>;
      city = typeof b["city"] === "string" ? b["city"] : "";
      area = typeof b["area"] === "string" ? b["area"] : "";
      sightedAt = typeof b["sightedAt"] === "string" ? b["sightedAt"] : "";
      message = typeof b["message"] === "string" ? b["message"] : "";
      reporterName = typeof b["reporterName"] === "string" ? b["reporterName"] : "";
      reporterContact = typeof b["reporterContact"] === "string" ? b["reporterContact"] : "";
    }
  } else {
    // Default: application/x-www-form-urlencoded
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json({ error: "Invalid form data" }, { status: 400 });
    }
    city = (formData.get("city") as string) || "";
    area = (formData.get("area") as string) || "";
    sightedAt = (formData.get("sightedAt") as string) || "";
    message = (formData.get("message") as string) || "";
    reporterName = (formData.get("reporterName") as string) || "";
    reporterContact = (formData.get("reporterContact") as string) || "";
  }

  // Validation
  city = city.trim();
  area = area.trim();
  sightedAt = sightedAt.trim();
  message = message.trim();
  reporterName = reporterName.trim();
  reporterContact = reporterContact.trim();

  if (city.length < 1 || city.length > 80) {
    return Response.json({ error: "City is required (max 80 characters)" }, { status: 400 });
  }
  if (area.length > 120) {
    return Response.json({ error: "Area must be 120 characters or fewer" }, { status: 400 });
  }
  if (sightedAt.length > 80) {
    return Response.json({ error: "Sighted-at must be 80 characters or fewer" }, { status: 400 });
  }
  if (message.length > 1000) {
    return Response.json({ error: "Message must be 1000 characters or fewer" }, { status: 400 });
  }
  if (reporterName.length > 80) {
    return Response.json({ error: "Reporter name must be 80 characters or fewer" }, { status: 400 });
  }
  if (reporterContact.length > 120) {
    return Response.json({ error: "Reporter contact must be 120 characters or fewer" }, { status: 400 });
  }

  // Build location_text
  const locationText = city + (area ? ", " + area : "");

  // Build combined message
  const parts: string[] = [];
  if (sightedAt) parts.push("Sighted at: " + sightedAt);
  if (message) parts.push(message);
  if (reporterName) parts.push("Reporter: " + reporterName);
  if (reporterContact) parts.push("Contact: " + reporterContact);
  const combinedMessage = parts.join("\n") || null;

  // Hash IP
  const reporterIpHash = await sha256Hex(ip);

  await insertSightingReport(db, {
    catPublicId: publicId,
    message: combinedMessage,
    location_text: locationText,
    reporter_ip_hash: reporterIpHash,
  });

  return new Response(
    renderSuccessPage(publicId),
    {
      status: 200,
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

// ── GET /api/cats/:publicId/sightings ───────────────────────────────────────

export async function handleListSightingsForOwner(
  publicId: string,
  db: D1Database,
  ctx: RequestContext,
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response("Unauthorized", { status: 401 });
  }

  const reports = await listSightingReportsForOwner(db, publicId, ctx.ownerId);
  const safeReports = reports.map((r) => ({
    message: r.message,
    location_text: r.location_text,
    created_at: r.created_at,
  }));

  return Response.json(safeReports, { status: 200 });
}

// ── HTML renderers ──────────────────────────────────────────────────────────

function renderNotAcceptingPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sighting Report — MishiPass</title>
  <style>body{font-family:sans-serif;max-width:480px;margin:2rem auto;padding:0 1rem}</style>
</head>
<body>
  <p>This cat is not currently accepting sighting reports.</p>
</body>
</html>`;
}

function renderSightingForm(publicId: string, catName: string): string {
  const safeName = escapeHtml(catName);
  const safeId = escapeHtml(publicId);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Report a sighting — ${safeName} — MishiPass</title>
  <style>
    body{font-family:sans-serif;max-width:480px;margin:2rem auto;padding:0 1rem;line-height:1.5}
    h1{font-size:1.5rem;margin-bottom:1rem}
    label{display:block;margin-bottom:0.25rem;font-size:0.875rem;font-weight:500}
    input,textarea{width:100%;padding:0.5rem;border:1px solid #ccc;border-radius:4px;margin-bottom:0.75rem;font-size:1rem;box-sizing:border-box}
    textarea{resize:vertical;min-height:80px}
    button{padding:0.75rem 1.5rem;background:#111;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:1rem}
  </style>
</head>
<body>
  <h1>Report a sighting of ${safeName}</h1>
  <form method="POST" action="/c/${safeId}/sighting">
    <label for="city">City (required)</label>
    <input type="text" id="city" name="city" required maxlength="80" />
    <label for="area">Area / neighborhood</label>
    <input type="text" id="area" name="area" maxlength="120" />
    <label for="sightedAt">When was the cat sighted?</label>
    <input type="text" id="sightedAt" name="sightedAt" maxlength="80" />
    <label for="message">Additional details</label>
    <textarea id="message" name="message" maxlength="1000"></textarea>
    <label for="reporterName">Your name (optional)</label>
    <input type="text" id="reporterName" name="reporterName" maxlength="80" />
    <label for="reporterContact">Your contact info (optional)</label>
    <input type="text" id="reporterContact" name="reporterContact" maxlength="120" />
    <button type="submit">Submit sighting report</button>
  </form>
</body>
</html>`;
}

function renderSuccessPage(publicId: string): string {
  const safeId = escapeHtml(publicId);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sighting Submitted — MishiPass</title>
  <style>body{font-family:sans-serif;max-width:480px;margin:2rem auto;padding:0 1rem}</style>
</head>
<body>
  <p>Thank you. Your sighting report has been submitted.</p>
  <p><a href="/c/${safeId}">Back to profile</a></p>
</body>
</html>`;
}
