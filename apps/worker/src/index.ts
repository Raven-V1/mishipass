import { resolveSession } from "./middleware/session.js";
import { handleLogin, handleLogout, handleRegister } from "./routes/auth.js";
import { handleCreateCat, handlePublicProfile } from "./routes/cats.js";
import { handleSwitchToActive, handleSwitchToMissing } from "./routes/missingAlerts.js";

export interface Env {
  DB: D1Database;
  /** Set via wrangler secret / .dev.vars. Example: https://mishipass.com */
  PUBLIC_BASE_URL: string;
}

const PUBLIC_PROFILE_PATH = /^\/c\/([^/]+)$/;
const CAT_MISSING_PATH = /^\/api\/cats\/([^/]+)\/missing$/;
const CAT_ACTIVE_PATH = /^\/api\/cats\/([^/]+)\/active$/;
const PUBLIC_SITE_URL = "https://raven-v1.github.io/mishipass/";

function redirectToPublicSite(): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: PUBLIC_SITE_URL,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { method, url } = request;
    const { pathname } = new URL(url);

    if ((method === "GET" || method === "HEAD") && pathname === "/") {
      return redirectToPublicSite();
    }

    if (method === "POST" && pathname === "/api/auth/register") {
      return handleRegister(request, env.DB);
    }
    if (method === "POST" && pathname === "/api/auth/login") {
      return handleLogin(request, env.DB);
    }
    if (method === "POST" && pathname === "/api/auth/logout") {
      return handleLogout(request, env.DB);
    }

    const missingMatch = CAT_MISSING_PATH.exec(pathname);
    if (method === "POST" && missingMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleSwitchToMissing(request, missingMatch[1]!, env.DB, env.PUBLIC_BASE_URL, ctx);
    }

    const activeMatch = CAT_ACTIVE_PATH.exec(pathname);
    if (method === "POST" && activeMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleSwitchToActive(request, activeMatch[1]!, env.DB, ctx);
    }

    if (method === "POST" && pathname === "/api/cats") {
      const ctx = await resolveSession(request, env.DB);
      return handleCreateCat(request, env.DB, env.PUBLIC_BASE_URL, ctx);
    }

    const profileMatch = PUBLIC_PROFILE_PATH.exec(pathname);
    if (method === "GET" && profileMatch) {
      return handlePublicProfile(profileMatch[1]!, env.DB);
    }

    return new Response("Not Found", { status: 404 });
  },
};
