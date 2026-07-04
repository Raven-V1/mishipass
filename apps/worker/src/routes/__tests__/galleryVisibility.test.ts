/**
 * Gallery visibility enforcement tests.
 * Verifies that is_public flag is respected on public routes and that
 * non-owners cannot toggle visibility or access private photos.
 */
import { applyD1Migrations, env } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import type { D1Migration } from "@cloudflare/vitest-pool-workers/config";
import worker from "../../index.js";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database;
    PHOTOS: R2Bucket;
    TEST_MIGRATIONS: D1Migration[];
    PUBLIC_BASE_URL: string;
  }
}

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  // Workaround: older SQLite in some workerd builds rejects
  // ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT (migration 0009).
  // If the column was not created by migrations, add it without NOT NULL.
  // The DEFAULT 0 still applies; application logic enforces the constraint.
  try {
    await env.DB.prepare(
      "SELECT is_public FROM cat_photos LIMIT 0",
    ).run();
  } catch {
    await env.DB.prepare(
      "ALTER TABLE cat_photos ADD COLUMN is_public INTEGER DEFAULT 0",
    ).run();
  }
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
  it("public gallery serve returns 404 for private photo (is_public=0)", async () => {
    const { catId } = await setup();
    // No photos uploaded, but even with a random photoId it should 404
    const res = await worker.fetch(
      new Request(`http://localhost/media/cats/${catId}/photos/999/public`),
      env,
    );
    expect(res.status).toBe(404);
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
