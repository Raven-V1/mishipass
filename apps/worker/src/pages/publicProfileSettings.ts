import type { RequestContext } from "../middleware/session.js";

export async function handlePublicProfileSettingsPage(
  publicId: string,
  _db: D1Database,
  ctx: RequestContext,
  _publicBaseUrl: string,
  lang = "en",
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response(null, { status: 302, headers: { Location: "/dashboard" } });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: `/dashboard/settings?lang=${encodeURIComponent(lang)}#privacy-${encodeURIComponent(publicId)}`,
    },
  });
}
