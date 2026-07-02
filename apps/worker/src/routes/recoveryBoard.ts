import { listRecoveryBoardAlerts, updateRecoveryBoardOptIn } from "../db/index.js";
import type { RequestContext } from "../middleware/session.js";
import { escapeHtml, htmlResponse } from "../utils/html.js";
import { validateId } from "@mishipass/shared-validation";

export async function handleRecoveryBoardPage(request: Request, db: D1Database): Promise<Response> {
  const url = new URL(request.url);
  const city = url.searchParams.get("city")?.trim() || undefined;
  const ageRaw = url.searchParams.get("ageDays");
  const ageDays = ageRaw ? Number.parseInt(ageRaw, 10) : undefined;
  const validAge = Number.isSafeInteger(ageDays) && ageDays! > 0 && ageDays! <= 365 ? ageDays : undefined;
  const alerts = await listRecoveryBoardAlerts(db, city, validAge);
  const cards = alerts.length === 0
    ? `<p class="empty">No opted-in missing alerts match these filters.</p>`
    : alerts.map(a => `<article class="card">
        ${a.photo_r2_key ? `<img src="/media/cats/${escapeHtml(a.public_id)}/photo" alt="${escapeHtml(a.name)}" />` : `<div class="placeholder">No photo</div>`}
        <h2>${escapeHtml(a.name)}</h2>
        ${a.city ? `<p>City: ${escapeHtml(a.city)}</p>` : ""}
        ${a.area ? `<p>Area: ${escapeHtml(a.area)}</p>` : ""}
        ${a.last_seen_at ? `<p>Last seen: ${escapeHtml(a.last_seen_at)}</p>` : ""}
        <a href="/c/${escapeHtml(a.public_id)}">Open public alert</a>
      </article>`).join("");
  return htmlResponse(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Recovery Board — MishiPass Beta 1.5</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;color:#111;line-height:1.5}.filters{display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1rem}input{padding:0.5rem;border:1px solid #ccc;border-radius:4px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem}.card{border:1px solid #ddd;border-radius:6px;padding:1rem}.card img,.placeholder{width:100%;aspect-ratio:4/3;object-fit:cover;background:#eee;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#666}</style></head>
<body>
  <h1>Recovery Board</h1>
  <form class="filters" method="GET" action="/recovery-board">
    <input name="city" placeholder="City" value="${city ? escapeHtml(city) : ""}" />
    <input name="ageDays" type="number" min="1" max="365" placeholder="Alert age days" value="${validAge ? String(validAge) : ""}" />
    <button type="submit">Filter</button>
  </form>
  <div class="grid">${cards}</div>
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
