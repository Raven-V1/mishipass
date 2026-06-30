import { getContactSettingsForOwner, upsertContactSettings } from "../db/index.js";
import type { RequestContext } from "../middleware/session.js";

export async function handleGetContactSettings(
  catPublicId: string,
  db: D1Database,
  ctx: RequestContext,
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response("Unauthorized", { status: 401 });
  }
  const settings = await getContactSettingsForOwner(db, catPublicId, ctx.ownerId);
  if (!settings) {
    return Response.json({ contact_mode: "relay", public_phone: null }, { status: 200 });
  }
  return Response.json({
    contact_mode: settings.contact_mode,
    public_phone: settings.public_phone,
  }, { status: 200 });
}

export async function handleUpsertContactSettings(
  catPublicId: string,
  request: Request,
  db: D1Database,
  ctx: RequestContext,
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const { contact_mode, public_phone } = body as Record<string, unknown>;

  const validModes = ["relay", "phone", "none"];
  const mode = typeof contact_mode === "string" && validModes.includes(contact_mode) ? contact_mode : "relay";
  const phone = typeof public_phone === "string" ? public_phone.slice(0, 30) : null;

  await upsertContactSettings(db, catPublicId, ctx.ownerId, {
    contact_mode: mode as "relay" | "phone" | "none",
    public_phone: phone,
  });

  return Response.json({}, { status: 200 });
}
