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

const ROOT_LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MishiPass</title>
  <meta name="description" content="Privacy-first dynamic QR passport and recovery system for cats." />
  <style>
    body{font-family:sans-serif;max-width:560px;margin:4rem auto;padding:0 1rem;color:#111}
    h1{font-size:2rem;margin-bottom:.5rem}
    .sub{color:#555;margin-bottom:1.5rem}
    .tag{font-family:monospace;background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:.875rem}
    a{color:#111}
  </style>
</head>
<body>
  <h1>MishiPass</h1>
  <p class="sub">Privacy-first dynamic QR passport and recovery system for cats.</p>
  <p>One permanent QR code per cat. Scan it at
    <span class="tag">/c/MP-XX-XXXX-XXXX</span> to see the cat&rsquo;s current profile.</p>
  <p><a href="https://github.com/Raven-V1/mishipass">GitHub &rarr;</a></p>
</body>
</html>`;

function handleRootLanding(method: string): Response {
  const headers = {
    "Content-Type": "text/html;charset=UTF-8",
    "X-Content-Type-Options": "nosniff",
  };
  if (method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }
  return new Response(ROOT_LANDING_HTML, { status: 200, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { method, url } = request;
    const { pathname } = new URL(url);

    if ((method === "GET" || method === "HEAD") && pathname === "/") {
      return handleRootLanding(method);
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
