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
  const email = `vetw-${uid}@test.com`;
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
      body: JSON.stringify({ name: "WeightCat", countryCode: "MX" }),
    }),
    env,
  );
  const cat = await catRes.json() as { publicId: string };
  return { cookie, catId: cat.publicId };
}

describe("Vet weight propagation", () => {
  it("weight entered in vet visit propagates to cat profile", async () => {
    const { cookie, catId } = await setup();

    // Start vet visit
    await worker.fetch(
      new Request(`http://localhost/api/cats/${catId}/vet-visit/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: "{}",
      }),
      env,
    );

    // Finish vet visit with weight
    const finishRes = await worker.fetch(
      new Request(`http://localhost/api/cats/${catId}/vet-visit/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinic_name: "Test Clinic",
          visit_date: "2026-07-03",
          weight: "4.5 kg",
        }),
      }),
      env,
    );
    expect(finishRes.status).toBe(200);

    // Verify weight appears on cat listing
    const catsRes = await worker.fetch(
      new Request("http://localhost/api/cats", { headers: { Cookie: cookie } }),
      env,
    );
    const cats = await catsRes.json() as Array<{ publicId: string; weight: string | null }>;
    const updatedCat = cats.find(c => c.publicId === catId);
    expect(updatedCat?.weight).toBe("4.5 kg");
  });

  it("vet visit without weight does not overwrite existing weight", async () => {
    const { cookie, catId } = await setup();

    // First visit sets weight
    await worker.fetch(
      new Request(`http://localhost/api/cats/${catId}/vet-visit/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: "{}",
      }),
      env,
    );
    await worker.fetch(
      new Request(`http://localhost/api/cats/${catId}/vet-visit/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight: "4.5 kg" }),
      }),
      env,
    );

    // Second visit without weight
    await worker.fetch(
      new Request(`http://localhost/api/cats/${catId}/vet-visit/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: "{}",
      }),
      env,
    );
    await worker.fetch(
      new Request(`http://localhost/api/cats/${catId}/vet-visit/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinic_name: "Second Visit" }),
      }),
      env,
    );

    // Verify weight preserved
    const catsRes = await worker.fetch(
      new Request("http://localhost/api/cats", { headers: { Cookie: cookie } }),
      env,
    );
    const cats = await catsRes.json() as Array<{ publicId: string; weight: string | null }>;
    const cat = cats.find(c => c.publicId === catId);
    expect(cat?.weight).toBe("4.5 kg");
  });
});
