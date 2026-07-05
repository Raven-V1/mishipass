import {
  findOwnerById,
  getCatPublicProfile,
  getTransferRequest,
  getTransferRequestsForOwner,
  hasPendingTransferRequest,
  insertTransferRequest,
  resolveTransferRequest,
  transferCatOwnership,
} from "../db/index.js";
import { sendEmail } from "../utils/email.js";
import type { RequestContext } from "../middleware/session.js";

// ── POST /api/cats/:catId/request-transfer ─────────────────────────────────

export async function handleRequestTransfer(
  request: Request,
  catPublicId: string,
  db: D1Database,
  ctx: RequestContext,
  resendApiKey: string | undefined,
  publicBaseUrl: string,
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response("Unauthorized", { status: 401 });
  }

  const cat = await getCatPublicProfile(db, catPublicId);
  if (!cat || cat.current_mode !== "adoption") {
    return new Response("Not Found", { status: 404 });
  }

  // Ownership check: cat must NOT belong to the requester
  const catOwner = await db
    .prepare(`SELECT owner_id FROM cats WHERE public_id = ? AND deleted_at IS NULL`)
    .bind(catPublicId)
    .first<{ owner_id: number }>();

  if (!catOwner) return new Response("Not Found", { status: 404 });
  if (catOwner.owner_id === ctx.ownerId) {
    return new Response("Cannot request transfer of your own cat", { status: 400 });
  }

  // Prevent duplicate pending requests
  const alreadyPending = await hasPendingTransferRequest(db, catPublicId, ctx.ownerId);
  if (alreadyPending) {
    return new Response("You already have a pending request for this cat", { status: 409 });
  }

  let message: string | null = null;
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.message === "string" && body.message.trim()) {
      message = body.message.trim().slice(0, 500);
    }
  } catch { /* message is optional */ }

  const requestId = await insertTransferRequest(
    db, catPublicId, ctx.ownerId, catOwner.owner_id, message,
  );

  // Email the current owner
  const [requester, currentOwner] = await Promise.all([
    findOwnerById(db, ctx.ownerId),
    findOwnerById(db, catOwner.owner_id),
  ]);

  if (currentOwner) {
    await sendEmail({
      to: currentOwner.email,
      subject: `Someone wants to adopt ${cat.name} — MishiPass`,
      html: `
        <p>Hi,</p>
        <p><strong>${requester?.email ?? "Someone"}</strong> has requested to adopt <strong>${cat.name}</strong>.</p>
        ${message ? `<p>Their message: <em>${message}</em></p>` : ""}
        <p>Log in to your dashboard to accept or decline: <a href="${publicBaseUrl}/dashboard">${publicBaseUrl}/dashboard</a></p>
        <p>— MishiPass</p>
      `,
    }, resendApiKey);
  }

  return Response.json({ requestId }, { status: 201 });
}

// ── GET /api/transfer-requests ─────────────────────────────────────────────

export async function handleListTransferRequests(
  db: D1Database,
  ctx: RequestContext,
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response("Unauthorized", { status: 401 });
  }
  const requests = await getTransferRequestsForOwner(db, ctx.ownerId);
  return Response.json({ requests }, { status: 200 });
}

// ── POST /api/transfer-requests/:id/accept ─────────────────────────────────

export async function handleAcceptTransfer(
  requestId: number,
  db: D1Database,
  ctx: RequestContext,
  resendApiKey: string | undefined,
  publicBaseUrl: string,
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response("Unauthorized", { status: 401 });
  }

  const transferReq = await getTransferRequest(db, requestId, ctx.ownerId);
  if (!transferReq) return new Response("Not Found", { status: 404 });

  const transferred = await transferCatOwnership(
    db, transferReq.cat_public_id, ctx.ownerId, transferReq.requester_owner_id,
  );
  if (!transferred) return new Response("Transfer failed", { status: 500 });

  await resolveTransferRequest(db, requestId, ctx.ownerId, "accepted");

  // Notify requester
  const requester = await findOwnerById(db, transferReq.requester_owner_id);
  if (requester) {
    const cat = await getCatPublicProfile(db, transferReq.cat_public_id);
    await sendEmail({
      to: requester.email,
      subject: `Your adoption request was accepted — MishiPass`,
      html: `
        <p>Hi,</p>
        <p>Your request to adopt <strong>${cat?.name ?? "the cat"}</strong> has been accepted!</p>
        <p>The cat is now in your MishiPass account: <a href="${publicBaseUrl}/dashboard">${publicBaseUrl}/dashboard</a></p>
        <p>— MishiPass</p>
      `,
    }, resendApiKey);
  }

  return Response.json({ success: true }, { status: 200 });
}

// ── POST /api/transfer-requests/:id/decline ────────────────────────────────

export async function handleDeclineTransfer(
  requestId: number,
  db: D1Database,
  ctx: RequestContext,
  resendApiKey: string | undefined,
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response("Unauthorized", { status: 401 });
  }

  const transferReq = await getTransferRequest(db, requestId, ctx.ownerId);
  if (!transferReq) return new Response("Not Found", { status: 404 });

  await resolveTransferRequest(db, requestId, ctx.ownerId, "declined");

  const requester = await findOwnerById(db, transferReq.requester_owner_id);
  if (requester) {
    const cat = await getCatPublicProfile(db, transferReq.cat_public_id);
    await sendEmail({
      to: requester.email,
      subject: `Adoption request update — MishiPass`,
      html: `
        <p>Hi,</p>
        <p>Your request to adopt <strong>${cat?.name ?? "the cat"}</strong> was not accepted at this time.</p>
        <p>— MishiPass</p>
      `,
    }, resendApiKey);
  }

  return Response.json({ success: true }, { status: 200 });
}
