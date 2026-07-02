import { updateCatMode, upsertMissingAlert } from "../db/index.js";
import type { RequestContext } from "../middleware/session.js";

// ── POST /api/cats/:catId/missing ───────────────────────────────────────────

export async function handleSwitchToMissing(
  request: Request,
  catId: string,
  db: D1Database,
  publicBaseUrl: string,
  ctx: RequestContext,
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

  if (typeof body !== "object" || body === null) {
    return new Response("Invalid body", { status: 400 });
  }

  const {
    city,
    area,
    lastSeenAt,
    rewardAmount,
    rewardVisible,
    recoveryBoardOptIn,
  } = body as Record<string, unknown>;

  const updated = await updateCatMode(db, catId, ctx.ownerId, "missing");
  if (!updated) {
    return new Response("Forbidden", { status: 403 });
  }

  await upsertMissingAlert(db, catId, ctx.ownerId, {
    city: typeof city === "string" ? city : null,
    area: typeof area === "string" ? area : null,
    last_seen_at: typeof lastSeenAt === "string" ? lastSeenAt : null,
    reward_amount: typeof rewardAmount === "string" ? rewardAmount : null,
    reward_visible: rewardVisible ? 1 : 0,
    recovery_board_opt_in: recoveryBoardOptIn ? 1 : 0,
    activated_at: new Date().toISOString(),
  });

  return Response.json({ qrUrl: `${publicBaseUrl}/c/${catId}` }, { status: 200 });
}

// ── POST /api/cats/:catId/active ────────────────────────────────────────────

export async function handleSwitchToActive(
  request: Request,
  catId: string,
  db: D1Database,
  ctx: RequestContext,
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response("Unauthorized", { status: 401 });
  }

  const updated = await updateCatMode(db, catId, ctx.ownerId, "active");
  if (!updated) {
    return new Response("Forbidden", { status: 403 });
  }

  // Alert history record is preserved (not deleted) per Constitution Section 21.
  return Response.json({}, { status: 200 });
}
