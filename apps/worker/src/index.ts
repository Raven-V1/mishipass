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

function renderRootLandingPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MishiPass</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 680px; margin: 3rem auto; padding: 0 1rem; line-height: 1.5; color: #202124; }
    h1 { margin: 0 0 0.5rem; font-size: 2rem; }
    h2 { margin-top: 2rem; font-size: 1rem; }
    code { background: #f1f3f4; border-radius: 4px; padding: 0.1rem 0.3rem; }
    ul { padding-left: 1.25rem; }
  </style>
</head>
<body>
  <h1>MishiPass</h1>
  <p>MishiPass is a privacy-first dynamic QR passport and recovery system for cats.</p>
  <p>One permanent QR. Different mode when the cat needs it.</p>

  <h2>Current Beta modes</h2>
  <ul>
    <li>Active Profile</li>
    <li>Missing Alert</li>
    <li>Vet Visit</li>
  </ul>

  <h2>Public QR format</h2>
  <p>Public cat profiles use <code>/c/MP-XX-XXXX-XXXX</code>, for example <a href="/c/MP-MX-7X3B-9K21"><code>/c/MP-MX-7X3B-9K21</code></a>.</p>
  <p>Owner-controlled privacy. No internal database IDs exposed.</p>
</body>
</html>`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { method, url } = request;
    const { pathname } = new URL(url);

    if (method === "GET" && pathname === "/") {
      return new Response(renderRootLandingPage(), {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=UTF-8",
          "X-Content-Type-Options": "nosniff",
        },
      });
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
