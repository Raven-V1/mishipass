import { getOwnerSettings, isOwnerLanguageCode, upsertOwnerSettings } from "../db/index.js";
import type { RequestContext } from "../middleware/session.js";

export async function handleGetOwnerSettings(
  db: D1Database,
  ctx: RequestContext,
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response("Unauthorized", { status: 401 });
  }

  const settings = await getOwnerSettings(db, ctx.ownerId);
  return Response.json(settings, { status: 200 });
}

export async function handleUpsertOwnerSettings(
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

  const languageCode = typeof body === "object" && body !== null
    ? (body as Record<string, unknown>).language_code
    : null;

  if (typeof languageCode !== "string" || !isOwnerLanguageCode(languageCode)) {
    return Response.json({ error: "Unsupported language" }, { status: 400 });
  }

  await upsertOwnerSettings(db, ctx.ownerId, languageCode);
  return Response.json({ language_code: languageCode }, { status: 200 });
}
