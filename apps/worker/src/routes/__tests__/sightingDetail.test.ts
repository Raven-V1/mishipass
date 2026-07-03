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
});

async function setup() {
  const uid = Math.random().toString(36).slice(2, 10);
  const email = `sighting-${uid}@test.com`;
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
  const cookie = (/session=([^;]+)/.exec(setCookie) || [])[0] || "";
  const catRes = await worker.fetch(
    new Request("http://localhost/api/cats", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ name: "SightCat", countryCode: "MX" }),
    }),
    env,
  );
  const cat = await catRes.json() as { publicId: string };
  return { cookie, catId: cat.publicId };
}

describe("Sighting report detail - ownership scoping", () => {
  it("returns 404 for non-existent report timestamp", async () => {
    const { cookie, catId } = await setup();
    const res = await worker.fetch(
      new Request(`http://localhost/dashboard/cats/${catId}/sightings/2099-01-01T00%3A00%3A00Z`, {
        headers: { Cookie: cookie },
      }),
      env,
    );
    expect(res.status).toBe(404);
  });

  it("returns 302 redirect for unauthenticated access", async () => {
    const { catId } = await setup();
    const res = await worker.fetch(
      new Request(`http://localhost/dashboard/cats/${catId}/sightings/2099-01-01T00%3A00%3A00Z`),
      env,
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/dashboard");
  });

  it("returns 404 for another owner trying to view reports", async () => {
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
      new Request(`http://localhost/dashboard/cats/${catId}/sightings/2099-01-01T00%3A00%3A00Z`, {
        headers: { Cookie: otherCookie },
      }),
      env,
    );
    expect(res.status).toBe(404);
  });
});
