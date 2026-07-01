import { validateId } from "@mishipass/shared-validation";
import { getCatForOwner, getCatPublicProfile, updateCatPhoto } from "../db/index.js";
import type { RequestContext } from "../middleware/session.js";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_CAT_PHOTO_SIZE = 2 * 1024 * 1024; // 2 MB

function checkMagicBytes(header: Uint8Array, mimeType: string): boolean {
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
