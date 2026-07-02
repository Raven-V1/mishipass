import { validateId } from "@mishipass/shared-validation";
import {
  getCatForOwner,
  getVaccineForOwner,
  insertMedication,
  insertVaccine,
  listMedications,
  listVaccines,
  listVetVisits,
  updateVaccineStickerPhoto,
} from "../db/index.js";
import type { RequestContext } from "../middleware/session.js";
import { checkMagicBytes } from "./photos.js";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_STICKER_PHOTO_SIZE = 2 * 1024 * 1024;

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function assertOwner(ctx: RequestContext): ctx is { ownerId: number } {
  return ctx.ownerId !== null;
}

export async function handleCreateVaccine(
  publicId: string,
  request: Request,
  db: D1Database,
  ctx: RequestContext,
): Promise<Response> {
  if (!assertOwner(ctx)) return new Response("Unauthorized", { status: 401 });
  if (!validateId(publicId)) return new Response("Not Found", { status: 404 });
  if (!(await getCatForOwner(db, publicId, ctx.ownerId))) return new Response("Not Found", { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const vaccineName = clean(body.vaccine_name, 100);
  if (!vaccineName) return Response.json({ error: "vaccine_name is required" }, { status: 400 });

  await insertVaccine(db, publicId, ctx.ownerId, {
    vaccine_name: vaccineName,
    date_given: clean(body.date_given, 30),
  });
  return Response.json({ status: "created" }, { status: 201 });
}

export async function handleCreateMedication(
  publicId: string,
  request: Request,
  db: D1Database,
  ctx: RequestContext,
): Promise<Response> {
  if (!assertOwner(ctx)) return new Response("Unauthorized", { status: 401 });
  if (!validateId(publicId)) return new Response("Not Found", { status: 404 });
  if (!(await getCatForOwner(db, publicId, ctx.ownerId))) return new Response("Not Found", { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if ("recommendation" in body || "reminder_at" in body || "next_dose" in body || "interaction_check" in body || "refill_at" in body) {
    return Response.json({ error: "Medication Record stores documentation only" }, { status: 400 });
  }

  const medicationName = clean(body.medication_name, 100);
  if (!medicationName) return Response.json({ error: "medication_name is required" }, { status: 400 });

  await insertMedication(db, publicId, ctx.ownerId, {
    medication_name: medicationName,
    dose: clean(body.dose, 100),
    duration: clean(body.duration, 100),
    start_date: clean(body.start_date, 30),
    prescriber_name: clean(body.prescriber_name, 100),
    notes: clean(body.notes, 500),
  });
  return Response.json({ status: "created" }, { status: 201 });
}

export async function handleVaccineStickerUpload(
  publicId: string,
  vaccineIdRaw: string,
  request: Request,
  db: D1Database,
  photos: R2Bucket,
  ctx: RequestContext,
): Promise<Response> {
  if (!assertOwner(ctx)) return new Response("Unauthorized", { status: 401 });
  if (!validateId(publicId)) return new Response("Not Found", { status: 404 });
  const vaccineId = Number.parseInt(vaccineIdRaw, 10);
  if (!Number.isSafeInteger(vaccineId) || vaccineId <= 0) return new Response("Not Found", { status: 404 });
  const vaccine = await getVaccineForOwner(db, publicId, ctx.ownerId, vaccineId);
  if (!vaccine) return new Response("Not Found", { status: 404 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = (formData.get("photo") || formData.get("photoCapture") || formData.get("photoUpload")) as unknown;
  if (!file || typeof file === "string") return Response.json({ error: "No photo file provided" }, { status: 400 });
  const photoFile = file as File;
  if (!ALLOWED_TYPES.has(photoFile.type)) return Response.json({ error: "Invalid file type. Allowed: JPEG, PNG, WebP" }, { status: 400 });
  if (photoFile.size > MAX_STICKER_PHOTO_SIZE) return Response.json({ error: "File too large. Maximum 2 MB" }, { status: 400 });

  const fileBuffer = await photoFile.arrayBuffer();
  const headerView = new Uint8Array(fileBuffer, 0, Math.min(12, fileBuffer.byteLength));
  if (!checkMagicBytes(headerView, photoFile.type)) return Response.json({ error: "File content does not match declared type" }, { status: 400 });

  const ext = photoFile.type === "image/jpeg" ? "jpg" : photoFile.type === "image/png" ? "png" : "webp";
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, "0")).join("");
  const objectKey = `vaccines/${publicId}/${vaccineId}/${hex}.${ext}`;
  await photos.put(objectKey, fileBuffer, { httpMetadata: { contentType: photoFile.type } });
  await updateVaccineStickerPhoto(db, publicId, ctx.ownerId, vaccineId, objectKey);
  return Response.json({ status: "uploaded" }, { status: 200 });
}

export async function handleVaccineStickerServe(
  publicId: string,
  vaccineIdRaw: string,
  db: D1Database,
  photos: R2Bucket,
  ctx: RequestContext,
): Promise<Response> {
  if (!assertOwner(ctx)) return new Response("Unauthorized", { status: 401 });
  if (!validateId(publicId)) return new Response("Not Found", { status: 404 });
  const vaccineId = Number.parseInt(vaccineIdRaw, 10);
  if (!Number.isSafeInteger(vaccineId) || vaccineId <= 0) return new Response("Not Found", { status: 404 });
  const vaccine = await getVaccineForOwner(db, publicId, ctx.ownerId, vaccineId);
  if (!vaccine?.sticker_photo_r2_key) return new Response("Not Found", { status: 404 });
  const object = await photos.get(vaccine.sticker_photo_r2_key);
  if (!object) return new Response("Not Found", { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function handleCartillaSummaryJson(
  publicId: string,
  db: D1Database,
  ctx: RequestContext,
): Promise<Response> {
  if (!assertOwner(ctx)) return new Response("Unauthorized", { status: 401 });
  if (!validateId(publicId)) return new Response("Not Found", { status: 404 });
  if (!(await getCatForOwner(db, publicId, ctx.ownerId))) return new Response("Not Found", { status: 404 });
  const [vetVisits, vaccines, medications] = await Promise.all([
    listVetVisits(db, publicId, ctx.ownerId),
    listVaccines(db, publicId, ctx.ownerId),
    listMedications(db, publicId, ctx.ownerId),
  ]);
  return Response.json({ vetVisits, vaccines, medications }, { status: 200 });
}
