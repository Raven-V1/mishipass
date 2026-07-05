import { resolveSession } from "./middleware/session.js";
import { checkDurableRateLimit } from "./middleware/durableRateLimit.js";
import { hmacSha256Hex } from "./utils/crypto.js";
import { handleLogin, handleLogout, handleRegister } from "./routes/auth.js";
import { handleLogtoApple, handleLogtoCallback, handleLogtoGoogle } from "./routes/logto.js";
import { handleCreateCat, handleListCats, handlePublicProfile, handleRemoveCat, handleUpdateCat } from "./routes/cats.js";
import { handleGetContactSettings, handleUpsertContactSettings } from "./routes/contactSettings.js";
import { handleSwitchToActive, handleSwitchToAdoption, handleSwitchToMissing } from "./routes/missingAlerts.js";
import { handleSightingForm, handleSightingSubmit, handleListSightingsForOwner } from "./routes/sightingReports.js";
import { handleCatPhotoUpload, handleCatPhotoServe, handleSightingPhotoServe, handleListCatPhotos, handleGalleryPhotoUpload, handleSetProfilePhoto, handleDeleteGalleryPhoto, handleGalleryPhotoServe, handleTogglePhotoPublic, handlePublicGalleryPhotoServe } from "./routes/photos.js";
import { handleStartVetVisit, handleCancelVetVisit, handleVetVisitFinish } from "./routes/vetVisit.js";
import { handleCartillaSummaryJson, handleCreateMedication, handleCreateVaccine, handleVaccineStickerServe, handleVaccineStickerUpload } from "./routes/cartilla.js";
import { handleGetOwnerSettings, handleUpsertOwnerSettings } from "./routes/ownerSettings.js";
import { handleCatReferenceBreeds } from "./routes/catReference.js";
import { handleMissingCardPage } from "./routes/missingCard.js";
import { handleRequestTransfer, handleListTransferRequests, handleAcceptTransfer, handleDeclineTransfer } from "./routes/transferRequests.js";
import { handleRecoveryBoardOptIn, handleRecoveryBoardPage } from "./routes/recoveryBoard.js";
import { handleHistory, handleRoot } from "./pages/root.js";
import { handleDashboard } from "./pages/dashboard.js";
import { handleCatDetail } from "./pages/catDetail.js";
import { handleCartillaPage, handleVetVisitDetailPage } from "./pages/cartilla.js";
import { handleQrPage } from "./pages/qrPage.js";
import { handleSightingInbox, handleSightingDetail } from "./pages/sightingInbox.js";
import { getLanguageFromRequest, resolveOwnerLang } from "./utils/i18n.js";
import { handleBrandAsset } from "./utils/brandAssets.js";

export interface Env {
  DB: D1Database;
  /** Set via wrangler secret / .dev.vars. Example: https://mishipass.com */
  PUBLIC_BASE_URL: string;
  /** HMAC secret for hashing reporter IPs. Set via wrangler secret. */
  SIGHTING_IP_HMAC_SECRET?: string;
  /** R2 bucket for cat profile photos and sighting report photos. */
  PHOTOS: R2Bucket;
  /** Optional TheCatAPI key for reference-data assist. */
  THE_CAT_API_KEY?: string;
  /** Resend API key for transactional email. Set via wrangler secret. Graceful no-op if absent. */
  RESEND_API_KEY?: string;

  // ── Logto OIDC secrets (all optional — features disabled when absent) ──────
  /** Logto tenant URL, e.g. https://your-tenant.logto.app  */
  LOGTO_ENDPOINT?: string;
  /** Logto application client ID */
  LOGTO_APP_ID?: string;
  /** Logto application client secret. Never commit; set via `wrangler secret put`. */
  LOGTO_CLIENT_SECRET?: string;
  /** Absolute redirect URI registered in Logto, e.g. https://…/api/auth/logto/callback */
  LOGTO_REDIRECT_URI?: string;
  /** Logto connector target for Google (default: "google") */
  LOGTO_GOOGLE_CONNECTOR_TARGET?: string;
  /** Logto connector target for Apple (default: "apple") */
  LOGTO_APPLE_CONNECTOR_TARGET?: string;
}

// Route patterns
const PUBLIC_PROFILE_PATH = /^\/c\/([^/]+)$/;
const SIGHTING_PATH = /^\/c\/([^/]+)\/sighting$/;
const SIGHTINGS_API_PATH = /^\/api\/cats\/([^/]+)\/sightings$/;
const CAT_MISSING_PATH = /^\/api\/cats\/([^/]+)\/missing$/;
const CAT_ACTIVE_PATH = /^\/api\/cats\/([^/]+)\/active$/;
const CAT_ADOPTION_PATH = /^\/api\/cats\/([^/]+)\/adoption$/;
const CAT_REQUEST_TRANSFER_PATH = /^\/api\/cats\/([^/]+)\/request-transfer$/;
const TRANSFER_REQUESTS_PATH = /^\/api\/transfer-requests$/;
const TRANSFER_ACCEPT_PATH = /^\/api\/transfer-requests\/(\d+)\/accept$/;
const TRANSFER_DECLINE_PATH = /^\/api\/transfer-requests\/(\d+)\/decline$/;
const CONTACT_SETTINGS_PATH = /^\/api\/cats\/([^/]+)\/contact$/;
const CAT_PHOTO_UPLOAD = /^\/api\/cats\/([^/]+)\/photo$/;
const CAT_PHOTO_SERVE = /^\/media\/cats\/([^/]+)\/photo$/;
const SIGHTING_PHOTO_SERVE = /^\/api\/cats\/([^/]+)\/sightings\/([^/]+)\/photo$/;
const DASHBOARD_CAT_DETAIL = /^\/dashboard\/cats\/([^/]+)$/;
const DASHBOARD_CAT_CARTILLA = /^\/dashboard\/cats\/([^/]+)\/cartilla$/;
const DASHBOARD_CAT_VET_VISIT_DETAIL = /^\/dashboard\/cats\/([^/]+)\/cartilla\/vet-visits\/([^/]+)$/;
const DASHBOARD_CAT_MISSING_CARD = /^\/dashboard\/cats\/([^/]+)\/missing-card$/;
const DASHBOARD_CAT_QR = /^\/dashboard\/cats\/([^/]+)\/qr$/;
const DASHBOARD_CAT_SIGHTINGS = /^\/dashboard\/cats\/([^/]+)\/sightings$/;
const DASHBOARD_CAT_SIGHTING_DETAIL = /^\/dashboard\/cats\/([^/]+)\/sightings\/([^/]+)$/;
const VET_VISIT_START = /^\/api\/cats\/([^/]+)\/vet-visit\/start$/;
const VET_VISIT_CANCEL = /^\/api\/cats\/([^/]+)\/vet-visit\/cancel$/;
const VET_VISIT_FINISH = /^\/api\/cats\/([^/]+)\/vet-visit\/finish$/;
const CAT_REMOVE = /^\/api\/cats\/([^/]+)\/remove$/;
const VACCINES_API = /^\/api\/cats\/([^/]+)\/vaccines$/;
const MEDICATIONS_API = /^\/api\/cats\/([^/]+)\/medications$/;
const CARTILLA_API = /^\/api\/cats\/([^/]+)\/cartilla$/;
const VACCINE_STICKER_UPLOAD = /^\/api\/cats\/([^/]+)\/vaccines\/([^/]+)\/sticker-photo$/;
const VACCINE_STICKER_SERVE = /^\/media\/cats\/([^/]+)\/vaccines\/([^/]+)\/sticker-photo$/;
const RECOVERY_BOARD_OPT_IN = /^\/api\/cats\/([^/]+)\/recovery-board$/;
const CAT_PHOTOS_LIST = /^\/api\/cats\/([^/]+)\/photos$/;
const CAT_PHOTO_PROFILE = /^\/api\/cats\/([^/]+)\/photos\/(\d+)\/profile$/;
const CAT_PHOTO_DELETE = /^\/api\/cats\/([^/]+)\/photos\/(\d+)\/delete$/;
const CAT_GALLERY_SERVE = /^\/media\/cats\/([^/]+)\/photos\/(\d+)$/;
const CAT_UPDATE = /^\/api\/cats\/([^/]+)\/update$/;
const CAT_PHOTO_TOGGLE_PUBLIC = /^\/api\/cats\/([^/]+)\/photos\/(\d+)\/visibility$/;
const CAT_PUBLIC_GALLERY_SERVE = /^\/media\/cats\/([^/]+)\/photos\/(\d+)\/public$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { method, url } = request;
    const { pathname } = new URL(url);

    // -- Static pages --

    const brandAsset = (method === "GET" || method === "HEAD") ? handleBrandAsset(pathname, request) : null;
    if (brandAsset) return brandAsset;

    if ((method === "GET" || method === "HEAD") && pathname === "/") {
      return handleRoot(request, env);
    }

    if ((method === "GET" || method === "HEAD") && pathname === "/history") {
      return handleHistory(request);
    }

    if (method === "GET" && pathname === "/dashboard") {
      return handleDashboard(env);
    }

    if (method === "GET" && pathname === "/recovery-board") {
      return handleRecoveryBoardPage(request, env.DB);
    }

    // -- Dashboard sub-routes (auth-required HTML pages) --

    const detailMatch = DASHBOARD_CAT_DETAIL.exec(pathname);
    if (method === "GET" && detailMatch) {
      const ctx = await resolveSession(request, env.DB);
      const lang = ctx.ownerId ? await resolveOwnerLang(env.DB, ctx.ownerId) : "en" as const;
      return handleCatDetail(detailMatch[1]!, env.DB, ctx, env.PUBLIC_BASE_URL, lang);
    }

    const cartillaPageMatch = DASHBOARD_CAT_CARTILLA.exec(pathname);
    if (method === "GET" && cartillaPageMatch) {
      const ctx = await resolveSession(request, env.DB);
      const lang = ctx.ownerId ? await resolveOwnerLang(env.DB, ctx.ownerId) : "en" as const;
      return handleCartillaPage(cartillaPageMatch[1]!, env.DB, ctx, lang);
    }

    const vetVisitDetailMatch = DASHBOARD_CAT_VET_VISIT_DETAIL.exec(pathname);
    if (method === "GET" && vetVisitDetailMatch) {
      const ctx = await resolveSession(request, env.DB);
      const lang = ctx.ownerId ? await resolveOwnerLang(env.DB, ctx.ownerId) : "en" as const;
      return handleVetVisitDetailPage(vetVisitDetailMatch[1]!, vetVisitDetailMatch[2]!, env.DB, ctx, lang);
    }

    const qrMatch = DASHBOARD_CAT_QR.exec(pathname);
    if (method === "GET" && qrMatch) {
      const ctx = await resolveSession(request, env.DB);
      const lang = ctx.ownerId ? await resolveOwnerLang(env.DB, ctx.ownerId) : "en" as const;
      return handleQrPage(qrMatch[1]!, env.DB, ctx, env.PUBLIC_BASE_URL, lang);
    }

    const sightingsPageMatch = DASHBOARD_CAT_SIGHTINGS.exec(pathname);
    if (method === "GET" && sightingsPageMatch) {
      const ctx = await resolveSession(request, env.DB);
      const lang = ctx.ownerId ? await resolveOwnerLang(env.DB, ctx.ownerId) : "en" as const;
      return handleSightingInbox(sightingsPageMatch[1]!, env.DB, ctx, lang);
    }

    const sightingDetailMatch = DASHBOARD_CAT_SIGHTING_DETAIL.exec(pathname);
    if (method === "GET" && sightingDetailMatch) {
      const ctx = await resolveSession(request, env.DB);
      const lang = ctx.ownerId ? await resolveOwnerLang(env.DB, ctx.ownerId) : "en" as const;
      return handleSightingDetail(sightingDetailMatch[1]!, sightingDetailMatch[2]!, env.DB, env.PHOTOS, ctx, lang);
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

    // -- Logto OIDC (Google / Apple) --

    if (method === "GET" && pathname === "/api/auth/logto/google") {
      return handleLogtoGoogle(env);
    }
    if (method === "GET" && pathname === "/api/auth/logto/apple") {
      return handleLogtoApple(env);
    }
    if (method === "GET" && pathname === "/api/auth/logto/callback") {
      return handleLogtoCallback(request, env.DB, env);
    }

    // -- Owner settings API --

    if (pathname === "/api/settings") {
      const ctx = await resolveSession(request, env.DB);
      if (method === "GET") return handleGetOwnerSettings(env.DB, ctx);
      if (method === "POST") return handleUpsertOwnerSettings(request, env.DB, ctx);
    }

    // -- Cat reference API --

    if (method === "GET" && pathname === "/api/cat-reference/breeds") {
      return handleCatReferenceBreeds(env.THE_CAT_API_KEY);
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

    const adoptionMatch = CAT_ADOPTION_PATH.exec(pathname);
    if (method === "POST" && adoptionMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleSwitchToAdoption(request, adoptionMatch[1]!, env.DB, ctx);
    }

    const requestTransferMatch = CAT_REQUEST_TRANSFER_PATH.exec(pathname);
    if (method === "POST" && requestTransferMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleRequestTransfer(request, requestTransferMatch[1]!, env.DB, ctx, env.RESEND_API_KEY, env.PUBLIC_BASE_URL);
    }

    if (method === "GET" && TRANSFER_REQUESTS_PATH.test(pathname)) {
      const ctx = await resolveSession(request, env.DB);
      return handleListTransferRequests(env.DB, ctx);
    }

    const acceptTransferMatch = TRANSFER_ACCEPT_PATH.exec(pathname);
    if (method === "POST" && acceptTransferMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleAcceptTransfer(parseInt(acceptTransferMatch[1]!, 10), env.DB, ctx, env.RESEND_API_KEY, env.PUBLIC_BASE_URL);
    }

    const declineTransferMatch = TRANSFER_DECLINE_PATH.exec(pathname);
    if (method === "POST" && declineTransferMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleDeclineTransfer(parseInt(declineTransferMatch[1]!, 10), env.DB, ctx, env.RESEND_API_KEY);
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

    // -- Vet Visit API --

    const vetStartMatch = VET_VISIT_START.exec(pathname);
    if (method === "POST" && vetStartMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleStartVetVisit(vetStartMatch[1]!, env.DB, ctx);
    }

    const vetCancelMatch = VET_VISIT_CANCEL.exec(pathname);
    if (method === "POST" && vetCancelMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleCancelVetVisit(vetCancelMatch[1]!, env.DB, ctx);
    }

    const vetFinishMatch = VET_VISIT_FINISH.exec(pathname);
    if (method === "POST" && vetFinishMatch) {
      return handleVetVisitFinish(vetFinishMatch[1]!, request, env.DB, env.PHOTOS);
    }

    const missingCardMatch = DASHBOARD_CAT_MISSING_CARD.exec(pathname);
    if (method === "GET" && missingCardMatch) {
      const ctx = await resolveSession(request, env.DB);
      const lang = ctx.ownerId ? await resolveOwnerLang(env.DB, ctx.ownerId) : "en" as const;
      return handleMissingCardPage(missingCardMatch[1]!, env.DB, ctx, env.PUBLIC_BASE_URL, lang);
    }

    // -- Digital Cartilla API --

    const cartillaApiMatch = CARTILLA_API.exec(pathname);
    if (method === "GET" && cartillaApiMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleCartillaSummaryJson(cartillaApiMatch[1]!, env.DB, ctx);
    }

    const vaccinesApiMatch = VACCINES_API.exec(pathname);
    if (method === "POST" && vaccinesApiMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleCreateVaccine(vaccinesApiMatch[1]!, request, env.DB, ctx);
    }

    const medicationsApiMatch = MEDICATIONS_API.exec(pathname);
    if (method === "POST" && medicationsApiMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleCreateMedication(medicationsApiMatch[1]!, request, env.DB, ctx);
    }

    const stickerUploadMatch = VACCINE_STICKER_UPLOAD.exec(pathname);
    if (method === "POST" && stickerUploadMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleVaccineStickerUpload(stickerUploadMatch[1]!, stickerUploadMatch[2]!, request, env.DB, env.PHOTOS, ctx);
    }

    // -- Cat remove API --

    const catRemoveMatch = CAT_REMOVE.exec(pathname);
    if (method === "POST" && catRemoveMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleRemoveCat(catRemoveMatch[1]!, env.DB, ctx);
    }

    // -- Photo upload/serve --

    const photoUploadMatch = CAT_PHOTO_UPLOAD.exec(pathname);
    if (method === "POST" && photoUploadMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleCatPhotoUpload(photoUploadMatch[1]!, request, env.DB, env.PHOTOS, ctx);
    }

    const photoServeMatch = CAT_PHOTO_SERVE.exec(pathname);
    if (method === "GET" && photoServeMatch) {
      return handleCatPhotoServe(photoServeMatch[1]!, env.DB, env.PHOTOS);
    }

    const stickerServeMatch = VACCINE_STICKER_SERVE.exec(pathname);
    if (method === "GET" && stickerServeMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleVaccineStickerServe(stickerServeMatch[1]!, stickerServeMatch[2]!, env.DB, env.PHOTOS, ctx);
    }

    const sightingPhotoMatch = SIGHTING_PHOTO_SERVE.exec(pathname);
    if (method === "GET" && sightingPhotoMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleSightingPhotoServe(sightingPhotoMatch[1]!, decodeURIComponent(sightingPhotoMatch[2]!), env.DB, env.PHOTOS, ctx);
    }

    // -- Public sighting form --

    const sightingMatch = SIGHTING_PATH.exec(pathname);
    if (sightingMatch) {
      const id = sightingMatch[1]!;
      if (method === "GET") {
        return handleSightingForm(id, env.DB, getLanguageFromRequest(request));
      }
      if (method === "POST") {
        return handleSightingSubmit(id, request, env.DB, env.PHOTOS, env.SIGHTING_IP_HMAC_SECRET);
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
      // Durable rate limit for public cat lookup
      const lookupIp = request.headers.get("CF-Connecting-IP") || "unknown";
      if (env.SIGHTING_IP_HMAC_SECRET) {
        const hashedLookupIp = await hmacSha256Hex(lookupIp, env.SIGHTING_IP_HMAC_SECRET);
        const lookupKey = `lookup:${hashedLookupIp.slice(0, 16)}:${profileMatch[1]!}`;
        const lookupAllowed = await checkDurableRateLimit(env.DB, lookupKey, 60, 1);
        if (!lookupAllowed) {
          return new Response("Too many requests. Try again later.", { status: 429 });
        }
      }
      return handlePublicProfile(profileMatch[1]!, env.DB, getLanguageFromRequest(request));
    }

    const recoveryOptInMatch = RECOVERY_BOARD_OPT_IN.exec(pathname);
    if (method === "POST" && recoveryOptInMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleRecoveryBoardOptIn(recoveryOptInMatch[1]!, request, env.DB, ctx);
    }

    // -- Photo gallery API --

    const photosListMatch = CAT_PHOTOS_LIST.exec(pathname);
    if (photosListMatch) {
      const ctx = await resolveSession(request, env.DB);
      if (method === "GET") return handleListCatPhotos(photosListMatch[1]!, env.DB, ctx);
      if (method === "POST") return handleGalleryPhotoUpload(photosListMatch[1]!, request, env.DB, env.PHOTOS, ctx);
    }

    const photoProfileMatch = CAT_PHOTO_PROFILE.exec(pathname);
    if (method === "POST" && photoProfileMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleSetProfilePhoto(photoProfileMatch[1]!, parseInt(photoProfileMatch[2]!, 10), env.DB, ctx);
    }

    const photoDeleteMatch = CAT_PHOTO_DELETE.exec(pathname);
    if (method === "POST" && photoDeleteMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleDeleteGalleryPhoto(photoDeleteMatch[1]!, parseInt(photoDeleteMatch[2]!, 10), env.DB, env.PHOTOS, ctx);
    }

    const photoTogglePublicMatch = CAT_PHOTO_TOGGLE_PUBLIC.exec(pathname);
    if (method === "POST" && photoTogglePublicMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleTogglePhotoPublic(photoTogglePublicMatch[1]!, parseInt(photoTogglePublicMatch[2]!, 10), request, env.DB, ctx);
    }

    const galleryServeMatch = CAT_GALLERY_SERVE.exec(pathname);
    if (method === "GET" && galleryServeMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleGalleryPhotoServe(galleryServeMatch[1]!, parseInt(galleryServeMatch[2]!, 10), env.DB, env.PHOTOS, ctx);
    }

    const publicGalleryServeMatch = CAT_PUBLIC_GALLERY_SERVE.exec(pathname);
    if (method === "GET" && publicGalleryServeMatch) {
      return handlePublicGalleryPhotoServe(publicGalleryServeMatch[1]!, parseInt(publicGalleryServeMatch[2]!, 10), env.DB, env.PHOTOS);
    }

    const catUpdateMatch = CAT_UPDATE.exec(pathname);
    if (method === "POST" && catUpdateMatch) {
      const ctx = await resolveSession(request, env.DB);
      return handleUpdateCat(catUpdateMatch[1]!, request, env.DB, ctx);
    }

    return new Response("Not Found", { status: 404 });
  },
};
