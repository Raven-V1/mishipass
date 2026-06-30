import { resolveSession } from "./middleware/session.js";
import { handleLogin, handleLogout, handleRegister } from "./routes/auth.js";
import { handleCreateCat, handleListCats, handlePublicProfile } from "./routes/cats.js";
import { handleGetContactSettings, handleUpsertContactSettings } from "./routes/contactSettings.js";
import { handleSwitchToActive, handleSwitchToMissing } from "./routes/missingAlerts.js";
import { handleSightingForm, handleSightingSubmit, handleListSightingsForOwner } from "./routes/sightingReports.js";
import { handleRoot } from "./pages/root.js";
import { handleDashboard } from "./pages/dashboard.js";
import { handleCatDetail } from "./pages/catDetail.js";
import { handleQrPage } from "./pages/qrPage.js";
import { handleSightingInbox } from "./pages/sightingInbox.js";

export interface Env {
  DB: D1Database;
  /** Set via wrangler secret / .dev.vars. Example: https://mishipass.com */
  PUBLIC_BASE_URL: string;
  /** HMAC secret for hashing reporter IPs. Set via wrangler secret. */
  SIGHTING_IP_HMAC_SECRET?: string;
}

// Route patterns
const PUBLIC_PROFILE_PATH = /^\/c\/([^/]+)$/;
const SIGHTING_PATH = /^\/c\/([^/]+)\/sighting$/;
const SIGHTINGS_API_PATH = /^\/api\/cats\/([^/]+)\/sightings$/;
const CAT_MISSING_PATH = /^\/api\/cats\/([^/]+)\/missing$/;
const CAT_ACTIVE_PATH = /^\/api\/cats\/([^/]+)\/active$/;
const CONTACT_SETTINGS_PATH = /^\/api\/cats\/([^/]+)\/contact$/;
const DASHBOARD_CAT_DETAIL = /^\/dashboard\/cats\/([^/]+)$/;
const DASHBOARD_CAT_QR = /^\/dashboard\/cats\/([^/]+)\/qr$/;
const DASHBOARD_CAT_SIGHTINGS = /^\/dashboard\/cats\/([^/]+)\/sightings$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { method, url } = request;
    const { pathname } = new URL(url);

    // -- Static pages --

    if ((method === "GET" || method === "HEAD") && pathname === "/") {
      return handleRoot(method);
    }

    if (method === "GET" && pathname === "/dashboard") {
      return handleDashboard();
    }

    // -- Dashboard sub-routes (auth-required HTML pages) --

    const detailMatch = DASHBOARD_CAT_DETAIL.exec(pathname);
    if (method === "GET" && detailMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleCatDetail(detailMatch[1]!, env.DB, ctx, env.PUBLIC_BASE_URL);
    }

    const qrMatch = DASHBOARD_CAT_QR.exec(pathname);
    if (method === "GET" && qrMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleQrPage(qrMatch[1]!, env.DB, ctx, env.PUBLIC_BASE_URL);
    }

    const sightingsPageMatch = DASHBOARD_CAT_SIGHTINGS.exec(pathname);
    if (method === "GET" && sightingsPageMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleSightingInbox(sightingsPageMatch[1]!, env.DB, ctx);
    }

    // -- Auth API --

    if (method === "POST" && pathname === "/api/auth/register") {
      return handleRegister(request, env.DB);
    }
    if (method === "POST" && pathname === "/api/auth/login") {
      return handleLogin(request, env.DB);
    }
    if (method === "POST" && pathname === "/api/auth/logout") {
      return handleLogout(request, env.DB);
    }

    // -- Cat mode API --

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

    // -- Contact settings API --

    const contactMatch = CONTACT_SETTINGS_PATH.exec(pathname);
    if (contactMatch) {
      const ctx = await resolveSession(request, env.DB);
      if (method === "GET") {
        return handleGetContactSettings(contactMatch[1]!, env.DB, ctx);
      }
      if (method === "POST") {
        return handleUpsertContactSettings(contactMatch[1]!, request, env.DB, ctx);
      }
    }

    // -- Cats API --

    if (method === "GET" && pathname === "/api/cats") {
      const ctx = await resolveSession(request, env.DB);
      return handleListCats(env.DB, env.PUBLIC_BASE_URL, ctx);
    }

    if (method === "POST" && pathname === "/api/cats") {
      const ctx = await resolveSession(request, env.DB);
      return handleCreateCat(request, env.DB, env.PUBLIC_BASE_URL, ctx);
    }

    // -- Public sighting form --

    const sightingMatch = SIGHTING_PATH.exec(pathname);
    if (sightingMatch) {
      const id = sightingMatch[1]!;
      if (method === "GET") {
        return handleSightingForm(id, env.DB);
      }
      if (method === "POST") {
        return handleSightingSubmit(id, request, env.DB, env.SIGHTING_IP_HMAC_SECRET);
      }
    }

    // -- Sightings API (owner) --

    const sightingsApiMatch = SIGHTINGS_API_PATH.exec(pathname);
    if (method === "GET" && sightingsApiMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleListSightingsForOwner(sightingsApiMatch[1]!, env.DB, ctx);
    }

    // -- Public profile --

    const profileMatch = PUBLIC_PROFILE_PATH.exec(pathname);
    if (method === "GET" && profileMatch) {
      return handlePublicProfile(profileMatch[1]!, env.DB);
    }

    return new Response("Not Found", { status: 404 });
  },
};
