/**
 * Gallery visibility enforcement tests.
 * Verifies that is_public flag is respected on public routes and that
 * non-owners cannot toggle visibility or access private photos.
 */
import { applyD1Migrations, env } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import worker from "../../index.js";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database;
    PHOTOS: R2Bucket;
    TEST_MIGRATIONS: D1MigrationEntry[];
    PUBLIC_BASE_URL: string;
  }
}

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

async function setup() {
  const uid = Math.random().toString(36).slice(2, 10);
  const email = `vis-${uid}@test.com`;
  await worker.fetch(
    new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "testpass123" }),
    }),
    env,
  );
  const loginRes = await worker.fetch(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "testpass123" }),
    }),
    env,
  );
  const cookie = (/session=([^;]+)/.exec(loginRes.headers.get("Set-Cookie") || "") || [])[0] || "";
  const catRes = await worker.fetch(
    new Request("http://localhost/api/cats", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "VisCat", countryCode: "MX" }),
    }),
    env,
  );
  const cat = await catRes.json() as { publicId: string };
  return { cookie, catId: cat.publicId };
}

describe("Gallery visibility enforcement", () => {
  it("public gallery serve returns 404 for old-style integer photoId (route does not match)", async () => {
    const { catId } = await setup();
    // Old integer-based URL should no longer match the route regex
    const res = await worker.fetch(
      new Request(`http://localhost/media/cats/${catId}/photos/999/public`),
      env,
    );
    expect(res.status).toBe(404);
  });

  it("public gallery serve returns 404 for non-existent photo_public_id", async () => {
    const { catId } = await setup();
    // Valid format but non-existent photo_public_id (16 Crockford Base32 chars)
    const res = await worker.fetch(
      new Request(`http://localhost/media/cats/${catId}/photos/AAAAAAAAAAAAAAAA/public`),
      env,
    );
    expect(res.status).toBe(404);
  });

  it("public gallery serve returns 404 for valid photo_public_id paired with wrong cat publicId", async () => {
    const { cookie, catId } = await setup();
    // Upload a photo to get a real photo_public_id
    const jpegHeader = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, ...new Array(96).fill(0)]);
    const form = new FormData();
    form.append("photo", new File([jpegHeader], "test.jpg", { type: "image/jpeg" }));
    const uploadRes = await worker.fetch(
      new Request(`http://localhost/api/cats/${catId}/photos`, {
        method: "POST",
        headers: { Cookie: cookie },
        body: form,
      }),
      env,
    );
    expect(uploadRes.status).toBe(201);
    const { photoPublicId } = await uploadRes.json() as { photoPublicId: string };

    // Toggle photo to public
    const listRes = await worker.fetch(
      new Request(`http://localhost/api/cats/${catId}/photos`, { headers: { Cookie: cookie } }),
      env,
    );
    const { photos } = await listRes.json() as { photos: Array<{ id: number }> };
    await worker.fetch(
      new Request(`http://localhost/api/cats/${catId}/photos/${photos[0]!.id}/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ isPublic: true }),
      }),
      env,
    );

    // Create a second cat
    const cat2Res = await worker.fetch(
      new Request("http://localhost/api/cats", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ name: "OtherCat", countryCode: "MX" }),
      }),
      env,
    );
    const cat2 = await cat2Res.json() as { publicId: string };

    // Try accessing the photo via the WRONG cat's publicId
    const crossCatRes = await worker.fetch(
      new Request(`http://localhost/media/cats/${cat2.publicId}/photos/${photoPublicId}/public`),
      env,
    );
    expect(crossCatRes.status).toBe(404);
  });

  it("public gallery serve succeeds with valid photo_public_id, matching publicId, and is_public=1", async () => {
    const { cookie, catId } = await setup();
    // Upload a photo
    const jpegHeader = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, ...new Array(96).fill(0)]);
    const form = new FormData();
    form.append("photo", new File([jpegHeader], "test.jpg", { type: "image/jpeg" }));
    const uploadRes = await worker.fetch(
      new Request(`http://localhost/api/cats/${catId}/photos`, {
        method: "POST",
        headers: { Cookie: cookie },
        body: form,
      }),
      env,
    );
    expect(uploadRes.status).toBe(201);
    const { photoPublicId } = await uploadRes.json() as { photoPublicId: string };

    // Toggle photo to public
    const listRes = await worker.fetch(
      new Request(`http://localhost/api/cats/${catId}/photos`, { headers: { Cookie: cookie } }),
      env,
    );
    const { photos } = await listRes.json() as { photos: Array<{ id: number }> };
    await worker.fetch(
      new Request(`http://localhost/api/cats/${catId}/photos/${photos[0]!.id}/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ isPublic: true }),
      }),
      env,
    );

    // Public serve should now succeed (200 with image data)
    const serveRes = await worker.fetch(
      new Request(`http://localhost/media/cats/${catId}/photos/${photoPublicId}/public`),
      env,
    );
    expect(serveRes.status).toBe(200);
    expect(serveRes.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("public gallery serve returns 404 when photo is private (is_public=0) even with valid photo_public_id", async () => {
    const { cookie, catId } = await setup();
    // Upload a photo (defaults to is_public=0)
    const jpegHeader = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, ...new Array(96).fill(0)]);
    const form = new FormData();
    form.append("photo", new File([jpegHeader], "test.jpg", { type: "image/jpeg" }));
    const uploadRes = await worker.fetch(
      new Request(`http://localhost/api/cats/${catId}/photos`, {
        method: "POST",
        headers: { Cookie: cookie },
        body: form,
      }),
      env,
    );
    expect(uploadRes.status).toBe(201);
    const { photoPublicId } = await uploadRes.json() as { photoPublicId: string };

    // Without toggling to public, the serve should 404
    const serveRes = await worker.fetch(
      new Request(`http://localhost/media/cats/${catId}/photos/${photoPublicId}/public`),
      env,
    );
    expect(serveRes.status).toBe(404);
  });

  it("toggle visibility requires authentication", async () => {
    const { catId } = await setup();
    const res = await worker.fetch(
      new Request(`http://localhost/api/cats/${catId}/photos/1/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: true }),
      }),
      env,
    );
    expect(res.status).toBe(401);
  });

  it("non-owner cannot toggle visibility", async () => {
    const { catId } = await setup();
    // Create another user
    const uid2 = Math.random().toString(36).slice(2, 10);
    await worker.fetch(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: `other-${uid2}@test.com`, password: "testpass123" }),
      }),
      env,
    );
    const otherLogin = await worker.fetch(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: `other-${uid2}@test.com`, password: "testpass123" }),
      }),
      env,
    );
    const otherCookie = (/session=([^;]+)/.exec(otherLogin.headers.get("Set-Cookie") || "") || [])[0] || "";

    const res = await worker.fetch(
      new Request(`http://localhost/api/cats/${catId}/photos/1/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: otherCookie },
        body: JSON.stringify({ isPublic: true }),
      }),
      env,
    );
    expect(res.status).toBe(404);
  });

  it("edit-cat update requires ownership (wrong owner -> 404)", async () => {
    const { catId } = await setup();
    const uid2 = Math.random().toString(36).slice(2, 10);
    await worker.fetch(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: `edit-${uid2}@test.com`, password: "testpass123" }),
      }),
      env,
    );
    const otherLogin = await worker.fetch(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: `edit-${uid2}@test.com`, password: "testpass123" }),
      }),
      env,
    );
    const otherCookie = (/session=([^;]+)/.exec(otherLogin.headers.get("Set-Cookie") || "") || [])[0] || "";

    const res = await worker.fetch(
      new Request(`http://localhost/api/cats/${catId}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: otherCookie },
        body: JSON.stringify({ name: "Hacked" }),
      }),
      env,
    );
    expect(res.status).toBe(404);
  });

  it("edit-cat update persists field changes for the owner", async () => {
    const { cookie, catId } = await setup();
    const res = await worker.fetch(
      new Request(`http://localhost/api/cats/${catId}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ birth_date: "2022-03-15", weight: "5.1 kg" }),
      }),
      env,
    );
    expect(res.status).toBe(200);

    // Verify via list API
    const listRes = await worker.fetch(
      new Request("http://localhost/api/cats", { headers: { Cookie: cookie } }),
      env,
    );
    const cats = await listRes.json() as Array<{ publicId: string; birthDate: string | null; weight: string | null }>;
    const cat = cats.find(c => c.publicId === catId);
    expect(cat?.birthDate).toBe("2022-03-15");
    expect(cat?.weight).toBe("5.1 kg");
  });
});
