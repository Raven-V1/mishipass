import { resolveSession } from "./middleware/session.js";
import { handleLogin, handleLogout, handleRegister } from "./routes/auth.js";
import { handleCreateCat, handlePublicProfile } from "./routes/cats.js";

export interface Env {
  DB: D1Database;
  /** Set via wrangler secret / .dev.vars. Example: https://mishipass.com */
  PUBLIC_BASE_URL: string;
}

const PUBLIC_PROFILE_PATH = /^\/c\/([^/]+)$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { method, url } = request;
    const { pathname } = new URL(url);

    if (method === "POST" && pathname === "/api/auth/register") {
      return handleRegister(request, env.DB);
    }
    if (method === "POST" && pathname === "/api/auth/login") {
      return handleLogin(request, env.DB);
    }
    if (method === "POST" && pathname === "/api/auth/logout") {
      return handleLogout(request, env.DB);
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
