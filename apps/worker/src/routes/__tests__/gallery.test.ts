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
  const email = `gallery-${uid}@test.com`;
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
  const setCookie = loginRes.headers.get("Set-Cookie") || "";
  const match = /session=([^;]+)/.exec(setCookie);
  const cookie = match ? `session=${match[1]}` : "";

  const catRes = await worker.fetch(
    new Request("http://localhost/api/cats", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "GalleryCat", countryCode: "MX" }),
    }),
    env,
  );
  const cat = await catRes.json() as { publicId: string };
  return { cookie, catId: cat.publicId, email };
}

describe("Photo gallery", () => {
  it("lists empty gallery for new cat", async () => {
    const { cookie, catId } = await setup();
    const res = await worker.fetch(
      new Request(`http://localhost/api/cats/${catId}/photos`, { headers: { Cookie: cookie } }),
      env,
    );
    expect(res.status).toBe(200);
    const data = await res.json() as { photos: unknown[] };
    expect(data.photos).toHaveLength(0);
  });

  it("rejects gallery list without auth", async () => {
    const { catId } = await setup();
    const res = await worker.fetch(
      new Request(`http://localhost/api/cats/${catId}/photos`),
      env,
    );
    expect(res.status).toBe(401);
  });

  it("rejects gallery access for non-owner", async () => {
    const { catId } = await setup();
    // Create another owner
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
      new Request(`http://localhost/api/cats/${catId}/photos`, { headers: { Cookie: otherCookie } }),
      env,
    );
    expect(res.status).toBe(404);
  });

  it("gallery photo serve requires auth", async () => {
    const { catId } = await setup();
    const res = await worker.fetch(
      new Request(`http://localhost/media/cats/${catId}/photos/1`),
      env,
    );
    expect(res.status).toBe(401);
  });

  it("set profile returns 404 for non-existent photo", async () => {
    const { cookie, catId } = await setup();
    const res = await worker.fetch(
      new Request(`http://localhost/api/cats/${catId}/photos/999/profile`, {
        method: "POST",
        headers: { Cookie: cookie },
      }),
      env,
    );
    expect(res.status).toBe(404);
  });

  it("delete returns 404 for non-existent photo", async () => {
    const { cookie, catId } = await setup();
    const res = await worker.fetch(
      new Request(`http://localhost/api/cats/${catId}/photos/999/delete`, {
        method: "POST",
        headers: { Cookie: cookie },
      }),
      env,
    );
    expect(res.status).toBe(404);
  });
});
