import { validateId } from "@mishipass/shared-validation";
import { getCatForOwner, getCatPublicProfile, listSightingReportsForOwner, updateCatPhoto, insertCatPhoto, listCatPhotos, setCatProfilePhoto, deleteCatPhoto, getCatPhotoR2Key, toggleCatPhotoPublic, getPublicCatPhotoR2Key } from "../db/index.js";
import type { RequestContext } from "../middleware/session.js";
import { checkDurableRateLimit } from "../middleware/durableRateLimit.js";
import { hmacSha256Hex } from "../utils/crypto.js";
import { validatePhotoPublicId } from "../utils/photoId.js";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_CAT_PHOTO_SIZE = 2 * 1024 * 1024; // 2 MB

function fallbackCatPlaceholder(label: string): Response {
  const safe = label
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640" role="img" aria-label="${safe} photo placeholder"><rect width="640" height="640" rx="48" fill="#FFF7F0"/><circle cx="320" cy="252" r="122" fill="#FFFFFF"/><path d="M226 248c0-54 42-102 94-102s94 48 94 102v76H226Z" fill="#24302f"/><path d="M250 176l32-64 46 58Zm140 0 32-64-78-6Z" fill="#24302f"/><circle cx="284" cy="250" r="10" fill="#FFFFFF"/><circle cx="356" cy="250" r="10" fill="#FFFFFF"/><path d="M308 286c8 10 16 14 24 14s16-4 24-14" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round"/><text x="320" y="470" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="700" fill="#24776E">${safe}</text><text x="320" y="514" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#667674">No photo uploaded yet</text></svg>`;
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml;charset=UTF-8",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function checkMagicBytes(header: Uint8Array, mimeType: string): boolean {
  if (header.length < 4) return false;

  if (mimeType === "image/jpeg") {
    return header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
  }
  if (mimeType === "image/png") {
    return header.length >= 8
      && header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47
      && header[4] === 0x0D && header[5] === 0x0A && header[6] === 0x1A && header[7] === 0x0A;
  }
  if (mimeType === "image/webp") {
    return header.length >= 12
      && header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46
      && header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50;
  }
  return false;
}

/**
 * POST /api/cats/:publicId/photo
 * Owner-only cat profile photo upload. Accepts multipart/form-data with field "photo".
 */
export async function handleCatPhotoUpload(
  publicId: string,
  request: Request,
  db: D1Database,
  photos: R2Bucket,
  ctx: RequestContext,
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!validateId(publicId)) {
    return new Response("Not Found", { status: 404 });
  }

  // Verify ownership
  const cat = await getCatForOwner(db, publicId, ctx.ownerId);
  if (!cat) {
    return new Response("Not Found", { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("photo") as unknown;
  if (!file || typeof file === "string") {
    return Response.json({ error: "No photo file provided" }, { status: 400 });
  }

  // At runtime in Workers, multipart file fields arrive as File objects
  const photoFile = file as File;

  if (!ALLOWED_TYPES.has(photoFile.type)) {
    return Response.json({ error: "Invalid file type. Allowed: JPEG, PNG, WebP" }, { status: 400 });
  }

  if (photoFile.size > MAX_CAT_PHOTO_SIZE) {
    return Response.json({ error: "File too large. Maximum 2 MB" }, { status: 400 });
  }

  // Read file content once for both validation and upload
  const fileBuffer = await photoFile.arrayBuffer();
  const headerView = new Uint8Array(fileBuffer, 0, Math.min(12, fileBuffer.byteLength));

  // Validate file content matches claimed MIME type (magic bytes)
  if (!checkMagicBytes(headerView, photoFile.type)) {
    return Response.json({ error: "File content does not match declared type" }, { status: 400 });
  }

  // Generate non-guessable key
  const ext = photoFile.type === "image/jpeg" ? "jpg" : photoFile.type === "image/png" ? "png" : "webp";
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, "0")).join("");
  const objectKey = `cats/${publicId}/${hex}.${ext}`;

  // Upload to R2 from the buffer
  await photos.put(objectKey, fileBuffer, {
    httpMetadata: { contentType: photoFile.type },
  });

  // Store key in D1
  await updateCatPhoto(db, publicId, ctx.ownerId, objectKey);

  return Response.json({ success: true }, { status: 200 });
}

/**
 * GET /media/cats/:publicId/photo
 * Public cat photo serving. Uses the cat's public_id to look up and serve the photo.
 * Does not expose the raw R2 key.
 */
export async function handleCatPhotoServe(
  publicId: string,
  db: D1Database,
  photos: R2Bucket,
): Promise<Response> {
  if (!validateId(publicId)) {
    return new Response("Not Found", { status: 404 });
  }

  const cat = await getCatPublicProfile(db, publicId);
  if (!cat || !cat.photo_r2_key) {
    return new Response("Not Found", { status: 404 });
  }

  const object = await photos.get(cat.photo_r2_key);
  if (!object) {
    return fallbackCatPlaceholder(cat.name);
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}


/**
 * GET /api/cats/:publicId/sightings/:createdAt/photo
 * Owner-only sighting photo serving. Sighting photos are private to the owner.
 */
export async function handleSightingPhotoServe(
  publicId: string,
  createdAt: string,
  db: D1Database,
  photos: R2Bucket,
  ctx: RequestContext,
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!validateId(publicId)) {
    return new Response("Not Found", { status: 404 });
  }

  // Get reports for this owner's cat and find matching one
  const reports = await listSightingReportsForOwner(db, publicId, ctx.ownerId);
  const report = reports.find(r => r.created_at === createdAt);
  if (!report || !report.photo_r2_key) {
    return new Response("Not Found", { status: 404 });
  }

  const object = await photos.get(report.photo_r2_key);
  if (!object) {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * GET /api/cats/:publicId/photos
 * Owner-only gallery listing. Returns photo metadata without R2 keys.
 */
export async function handleListCatPhotos(
  publicId: string,
  db: D1Database,
  ctx: RequestContext,
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!validateId(publicId)) {
    return new Response("Not Found", { status: 404 });
  }
  const cat = await getCatForOwner(db, publicId, ctx.ownerId);
  if (!cat) {
    return new Response("Not Found", { status: 404 });
  }
  const photos = await listCatPhotos(db, publicId, ctx.ownerId);
  const result = photos.map(p => ({
    id: p.id,
    isProfile: p.is_profile === 1,
    isPublic: p.is_public === 1,
    createdAt: p.created_at,
  }));
  return Response.json({ photos: result }, { status: 200 });
}

/**
 * POST /api/cats/:publicId/photos
 * Owner-only gallery photo upload. Uses the same validation as the profile photo upload.
 */
export async function handleGalleryPhotoUpload(
  publicId: string,
  request: Request,
  db: D1Database,
  photos: R2Bucket,
  ctx: RequestContext,
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!validateId(publicId)) {
    return new Response("Not Found", { status: 404 });
  }
  const cat = await getCatForOwner(db, publicId, ctx.ownerId);
  if (!cat) {
    return new Response("Not Found", { status: 404 });
  }

  const existingPhotos = await listCatPhotos(db, publicId, ctx.ownerId);
  if (existingPhotos.length >= 10) {
    return Response.json({ error: "Gallery limit reached (10 photos max for Beta)" }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("photo") as unknown;
  if (!file || typeof file === "string") {
    return Response.json({ error: "No photo file provided" }, { status: 400 });
  }

  const photoFile = file as File;
  if (!ALLOWED_TYPES.has(photoFile.type)) {
    return Response.json({ error: "Invalid file type. Allowed: JPEG, PNG, WebP" }, { status: 400 });
  }
  if (photoFile.size > MAX_CAT_PHOTO_SIZE) {
    return Response.json({ error: "File too large. Maximum 2 MB" }, { status: 400 });
  }

  const fileBuffer = await photoFile.arrayBuffer();
  const headerView = new Uint8Array(fileBuffer, 0, Math.min(12, fileBuffer.byteLength));
  if (!checkMagicBytes(headerView, photoFile.type)) {
    return Response.json({ error: "File content does not match declared type" }, { status: 400 });
  }

  const ext = photoFile.type === "image/jpeg" ? "jpg" : photoFile.type === "image/png" ? "png" : "webp";
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, "0")).join("");
  const objectKey = `cats/${publicId}/gallery/${hex}.${ext}`;

  await photos.put(objectKey, fileBuffer, { httpMetadata: { contentType: photoFile.type } });
  const photoPublicId = await insertCatPhoto(db, publicId, ctx.ownerId, objectKey);

  return Response.json({ success: true, photoPublicId }, { status: 201 });
}

/**
 * POST /api/cats/:publicId/photos/:photoId/profile
 * Set a gallery photo as the profile photo.
 */
export async function handleSetProfilePhoto(
  publicId: string,
  photoId: number,
  db: D1Database,
  ctx: RequestContext,
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!validateId(publicId)) {
    return new Response("Not Found", { status: 404 });
  }
  const success = await setCatProfilePhoto(db, publicId, ctx.ownerId, photoId);
  if (!success) {
    return new Response("Not Found", { status: 404 });
  }
  return Response.json({ success: true }, { status: 200 });
}

/**
 * POST /api/cats/:publicId/photos/:photoId/delete
 * Delete a gallery photo.
 */
export async function handleDeleteGalleryPhoto(
  publicId: string,
  photoId: number,
  db: D1Database,
  photos: R2Bucket,
  ctx: RequestContext,
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!validateId(publicId)) {
    return new Response("Not Found", { status: 404 });
  }
  const r2Key = await deleteCatPhoto(db, publicId, ctx.ownerId, photoId);
  if (!r2Key) {
    return new Response("Not Found", { status: 404 });
  }
  // Clean up R2 storage
  await photos.delete(r2Key);
  return Response.json({ success: true }, { status: 200 });
}

/**
 * GET /media/cats/:publicId/photos/:photoId
 * Owner-only gallery photo serving.
 */
export async function handleGalleryPhotoServe(
  publicId: string,
  photoId: number,
  db: D1Database,
  photoBucket: R2Bucket,
  ctx: RequestContext,
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!validateId(publicId)) {
    return new Response("Not Found", { status: 404 });
  }
  const r2Key = await getCatPhotoR2Key(db, publicId, ctx.ownerId, photoId);
  if (!r2Key) {
    return new Response("Not Found", { status: 404 });
  }
  const object = await photoBucket.get(r2Key);
  if (!object) {
    return new Response("Not Found", { status: 404 });
  }
  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}


/**
 * POST /api/cats/:publicId/photos/:photoId/visibility
 * Toggle is_public for a gallery photo.
 */
export async function handleTogglePhotoPublic(
  publicId: string,
  photoId: number,
  request: Request,
  db: D1Database,
  ctx: RequestContext,
): Promise<Response> {
  if (ctx.ownerId === null) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!validateId(publicId)) {
    return new Response("Not Found", { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (typeof body !== "object" || body === null || typeof (body as Record<string, unknown>)["isPublic"] !== "boolean") {
    return new Response("Body must include isPublic (boolean)", { status: 400 });
  }

  const { isPublic } = body as { isPublic: boolean };
  const updated = await toggleCatPhotoPublic(db, publicId, ctx.ownerId, photoId, isPublic);
  if (!updated) {
    return new Response("Not Found", { status: 404 });
  }

  return Response.json({ success: true }, { status: 200 });
}

/**
 * GET /media/cats/:publicId/photos/:photoPublicId/public
 * Public gallery photo serving. No auth required but photo must be is_public = 1.
 * Uses opaque photo_public_id instead of internal integer PK.
 * Rate-limited via HMAC-hashed IP, D1-backed counter (60 requests/min).
 */
export async function handlePublicGalleryPhotoServe(
  publicId: string,
  photoPublicId: string,
  db: D1Database,
  photoBucket: R2Bucket,
  hmacSecret: string | undefined,
  request: Request,
): Promise<Response> {
  if (!validateId(publicId)) {
    return new Response("Not Found", { status: 404 });
  }

  if (!validatePhotoPublicId(photoPublicId)) {
    return new Response("Not Found", { status: 404 });
  }

  // Rate limit: HMAC-hashed IP, matching the /c/:publicId lookup pattern (60/min)
  if (hmacSecret) {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const hashedIp = await hmacSha256Hex(ip, hmacSecret);
    const rateLimitKey = `gallery:${hashedIp.slice(0, 16)}:${publicId}`;
    const allowed = await checkDurableRateLimit(db, rateLimitKey, 60, 1);
    if (!allowed) {
      return new Response("Too many requests. Try again later.", { status: 429 });
    }
  }

  const r2Key = await getPublicCatPhotoR2Key(db, publicId, photoPublicId);
  if (!r2Key) {
    return new Response("Not Found", { status: 404 });
  }

  const object = await photoBucket.get(r2Key);
  if (!object) {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
