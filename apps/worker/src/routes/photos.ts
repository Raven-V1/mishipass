import { validateId } from "@mishipass/shared-validation";
import { getCatForOwner, getCatPublicProfile, updateCatPhoto } from "../db/index.js";
import type { RequestContext } from "../middleware/session.js";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_CAT_PHOTO_SIZE = 2 * 1024 * 1024; // 2 MB

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

  // Generate non-guessable key
  const ext = photoFile.type === "image/jpeg" ? "jpg" : photoFile.type === "image/png" ? "png" : "webp";
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, "0")).join("");
  const objectKey = `cats/${publicId}/${hex}.${ext}`;

  // Upload to R2
  await photos.put(objectKey, photoFile.stream(), {
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
