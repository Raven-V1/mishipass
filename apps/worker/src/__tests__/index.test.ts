import { describe, expect, it } from "vitest";
import worker, { type Env } from "../index.js";

const fakeEnv: Env = {
  DB: {
    prepare: () => ({
      bind: () => ({
        first: async () => null,
      }),
    }),
  } as unknown as D1Database,
  PUBLIC_BASE_URL: "https://mishipass.example.com",
  PHOTOS: {} as R2Bucket,
};

const FORBIDDEN_ROOT_TERMS = [
  "owner legal identity",
  "owner@example.com",
  "personal-account-subdomain",
  "personal-worker-url",
  "internal database ID",
  "Cloudflare Worker",
  "D1",
  "database",
  "API runtime",
  "backend",
];

const FORBIDDEN_DASHBOARD_TERMS = [
  "Cloudflare Worker",
  "D1",
  "database",
  "API runtime",
  "backend",
  "workers.dev",
  "internal database",
  "owner_id",
];

describe("worker fetch routes", () => {
  it("GET / returns a product landing page", async () => {
    const res = await worker.fetch(new Request("https://example.com/"), fakeEnv);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/html");
    const body = await res.text();
    expect(body).toContain("MishiPass");
  });

  it("HEAD / returns 200 with no body", async () => {
    const res = await worker.fetch(new Request("https://example.com/", { method: "HEAD" }), fakeEnv);

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("");
  });

  it("root landing page does not expose owner identity, stack internals, or private data", async () => {
    const res = await worker.fetch(new Request("https://example.com/"), fakeEnv);
    const body = await res.text();

    for (const term of FORBIDDEN_ROOT_TERMS) {
      expect(body).not.toContain(term);
    }
    expect(body).not.toContain("owner_id");
    expect(body).not.toContain("private cat data");
    expect(body).not.toMatch(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  });

  it("root landing page does not disclose route patterns", async () => {
    const res = await worker.fetch(new Request("https://example.com/"), fakeEnv);
    const body = await res.text();
    expect(body).not.toContain("/c/MP");
  });

  it("root page does not contain GitHub link", async () => {
    const res = await worker.fetch(new Request("https://example.com/"), fakeEnv);
    const body = await res.text();
    expect(body).not.toContain("github.com");
  });

  it("GET /c/invalid still returns not found", async () => {
    const res = await worker.fetch(new Request("https://example.com/c/invalid"), fakeEnv);

    expect(res.status).toBe(404);
  });

  it("POST /api/cats/:catId/missing returns 401 without a session", async () => {
    const res = await worker.fetch(
      new Request("https://example.com/api/cats/MP-MX-0000-0000/missing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastSeenCity: "Test City" }),
      }),
      fakeEnv,
    );

    expect(res.status).toBe(401);
  });

  it("GET / contains link to /dashboard", async () => {
    const res = await worker.fetch(new Request("https://example.com/"), fakeEnv);
    const body = await res.text();
    expect(body).toContain('href="/dashboard?lang=en"');
    expect(body).toContain("MishiPass Beta 1.5");
  });

  it("root page uses a local cat visual with accessible alt text", async () => {
    const res = await worker.fetch(new Request("https://example.com/"), fakeEnv);
    const body = await res.text();
    expect(body).toContain("White cat with brown spots");
    expect(body).toContain("<svg");
    expect(body).not.toContain("images.unsplash.com");
    expect(body).not.toContain("pexels.com");
  });

  it("root Spanish page does not leak hard-coded English homepage copy", async () => {
    const res = await worker.fetch(new Request("https://example.com/?lang=es"), fakeEnv);
    const body = await res.text();
    expect(body).toContain("Promesa de privacidad");
    expect(body).toContain("Sin dirección exacta");
    expect(body).toContain("Un QR. Tres modos.");
    expect(body).not.toContain("Privacy promise");
    expect(body).not.toContain("No exact address");
    expect(body).not.toContain("Owner-controlled contact");
    expect(body).not.toContain("Cartilla stays private");
    expect(body).not.toContain("Vet visits, vaccines");
  });

  it("root Kazakh page does not leak hard-coded English homepage copy", async () => {
    const res = await worker.fetch(new Request("https://example.com/?lang=kk-KZ"), fakeEnv);
    const body = await res.text();
    expect(body).toContain("Құпиялылық уәдесі");
    expect(body).toContain("Нақты мекенжай жоқ");
    expect(body).toContain("Бір QR. Үш режим.");
    expect(body).not.toContain("Privacy promise");
    expect(body).not.toContain("No exact address");
    expect(body).not.toContain("Owner-controlled contact");
    expect(body).not.toContain("Cartilla stays private");
    expect(body).not.toContain("Vet visits, vaccines");
  });

  it("history page renders translated headings and body copy", async () => {
    const es = await (await worker.fetch(new Request("https://example.com/history?lang=es"), fakeEnv)).text();
    const kk = await (await worker.fetch(new Request("https://example.com/history?lang=kk-KZ"), fakeEnv)).text();
    expect(es).toContain("Historia de MishiPass");
    expect(es).toContain("MishiPass existe");
    expect(es).not.toContain("MishiPass exists because");
    expect(kk).toContain("MishiPass тарихы");
    expect(kk).toContain("MishiPass мысықтың QR белгісі");
    expect(kk).not.toContain("MishiPass exists because");
  });
});

describe("GET /dashboard", () => {
  it("returns 200", async () => {
    const res = await worker.fetch(new Request("https://example.com/dashboard"), fakeEnv);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/html");
  });

  it("contains MishiPass heading", async () => {
    const res = await worker.fetch(new Request("https://example.com/dashboard"), fakeEnv);
    const body = await res.text();
    expect(body).toContain("MishiPass");
  });

  it("contains login form with email and password inputs", async () => {
    const res = await worker.fetch(new Request("https://example.com/dashboard"), fakeEnv);
    const body = await res.text();
    expect(body).toContain('type="email"');
    expect(body).toContain('type="password"');
  });

  it("does not contain forbidden terms exposing internals", async () => {
    const res = await worker.fetch(new Request("https://example.com/dashboard"), fakeEnv);
    const body = await res.text();
    for (const term of FORBIDDEN_DASHBOARD_TERMS) {
      expect(body).not.toContain(term);
    }
  });

  it("does not contain raw JSON links for sighting reports", async () => {
    const res = await worker.fetch(new Request("https://example.com/dashboard"), fakeEnv);
    const body = await res.text();
    expect(body).not.toContain("View sighting reports");
    // The dashboard JS uses /api/cats for fetch calls, but should not expose
    // /api/cats/.../sightings as a direct user-facing link
    expect(body).not.toContain('target="_blank">View sighting reports</a>');
  });

  it("contains country select dropdown", async () => {
    const res = await worker.fetch(new Request("https://example.com/dashboard"), fakeEnv);
    const body = await res.text();
    expect(body).toContain('<select id="cat-country"');
    expect(body).toContain("Select country");
    expect(body).toContain('value="MX"');
    expect(body).toContain("Mexico (MX)");
  });

  it("contains Contact and Privacy UI controls", async () => {
    const res = await worker.fetch(new Request("https://example.com/dashboard"), fakeEnv);
    const body = await res.text();
    expect(body).toContain("Contact &amp; Privacy");
    expect(body).toContain("contact-mode-select");
    expect(body).toContain("contact-save-btn");
  });

  it("contains board photo, language, and assisted breed/color controls without exposing API keys", async () => {
    const res = await worker.fetch(new Request("https://example.com/dashboard"), fakeEnv);
    const body = await res.text();
    expect(body).toContain("cat-board");
    expect(body).toContain("cat-photo-placeholder");
    expect(body).toContain('id="language-select"');
    expect(body).toContain("Español");
    expect(body).toContain("Қазақша");
    expect(body).toContain('id="breed-card-grid"');
    expect(body).toContain('id="breed-text-list"');
    expect(body).toContain("Featured visual breeds");
    expect(body).toContain("All breeds");
    expect(body).toContain("featuredBreeds");
    expect(body).toContain("breed-text-option");
    expect(body).toContain('id="breed-search"');
    expect(body).toContain('id="cat-breed"');
    expect(body).toContain('id="color-swatch-grid"');
    expect(body).toContain('id="cat-color"');
    expect(body).toContain("onerror=");
    expect(body).toContain("/api/cat-reference/breeds");
    expect(body).not.toContain("THE_CAT_API_KEY");
    expect(body).not.toContain("x-api-key");
  });

  it("does not contain .toUpperCase() in submit handler", async () => {
    const res = await worker.fetch(new Request("https://example.com/dashboard"), fakeEnv);
    const body = await res.text();
    expect(body).not.toContain(".toUpperCase()");
  });
});

describe("dashboard sub-routes (unauthenticated)", () => {
  it("GET /dashboard/cats/MP-MX-0000-0000 redirects without auth", async () => {
    const res = await worker.fetch(
      new Request("https://example.com/dashboard/cats/MP-MX-0000-0000"),
      fakeEnv,
    );
    // Should redirect to /dashboard
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("/dashboard");
  });

  it("GET /dashboard/cats/MP-MX-0000-0000/qr redirects without auth", async () => {
    const res = await worker.fetch(
      new Request("https://example.com/dashboard/cats/MP-MX-0000-0000/qr"),
      fakeEnv,
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("/dashboard");
  });

  it("GET /dashboard/cats/MP-MX-0000-0000/sightings redirects without auth", async () => {
    const res = await worker.fetch(
      new Request("https://example.com/dashboard/cats/MP-MX-0000-0000/sightings"),
      fakeEnv,
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("/dashboard");
  });

  it("GET /dashboard/cats/MP-MX-0000-0000/cartilla redirects without auth", async () => {
    const res = await worker.fetch(
      new Request("https://example.com/dashboard/cats/MP-MX-0000-0000/cartilla"),
      fakeEnv,
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("/dashboard");
  });
});

describe("Vet Visit route wiring", () => {
  it("POST /api/cats/:publicId/vet-visit/start routes to the owner-gated handler", async () => {
    const res = await worker.fetch(
      new Request("https://example.com/api/cats/MP-MX-0000-0000/vet-visit/start", { method: "POST" }),
      fakeEnv,
    );
    expect(res.status).toBe(401);
  });

  it("POST /api/cats/:publicId/vet-visit/cancel routes to the owner-gated handler", async () => {
    const res = await worker.fetch(
      new Request("https://example.com/api/cats/MP-MX-0000-0000/vet-visit/cancel", { method: "POST" }),
      fakeEnv,
    );
    expect(res.status).toBe(401);
  });

  it("POST /api/cats/:publicId/vet-visit/finish validates malformed public IDs before D1 access", async () => {
    const res = await worker.fetch(
      new Request("https://example.com/api/cats/bad-id/vet-visit/finish", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "clinic_name=Test",
      }),
      fakeEnv,
    );
    expect(res.status).toBe(404);
  });

  it("wrong methods for Vet Visit API routes return 404", async () => {
    const start = await worker.fetch(
      new Request("https://example.com/api/cats/MP-MX-0000-0000/vet-visit/start"),
      fakeEnv,
    );
    const cancel = await worker.fetch(
      new Request("https://example.com/api/cats/MP-MX-0000-0000/vet-visit/cancel"),
      fakeEnv,
    );
    const finish = await worker.fetch(
      new Request("https://example.com/api/cats/MP-MX-0000-0000/vet-visit/finish"),
      fakeEnv,
    );
    expect(start.status).toBe(404);
    expect(cancel.status).toBe(404);
    expect(finish.status).toBe(404);
  });
});

describe("media route wiring", () => {
  it("POST /api/cats/:publicId/photo routes to auth-gated upload handler", async () => {
    const res = await worker.fetch(
      new Request("https://example.com/api/cats/MP-MX-0000-0000/photo", { method: "POST" }),
      fakeEnv,
    );
    expect(res.status).toBe(401);
  });

  it("GET /api/cats/:publicId/sightings/:createdAt/photo routes to auth-gated private photo handler", async () => {
    const res = await worker.fetch(
      new Request("https://example.com/api/cats/MP-MX-0000-0000/sightings/2026-06-30T00%3A00%3A00Z/photo"),
      fakeEnv,
    );
    expect(res.status).toBe(401);
  });

  it("public numeric cat paths and raw object-key-like routes are not wired", async () => {
    const numeric = await worker.fetch(new Request("https://example.com/cat/1"), fakeEnv);
    const rawR2Key = await worker.fetch(new Request("https://example.com/media/cats/MP-MX-0000-0000/secret-key.jpg"), fakeEnv);
    expect(numeric.status).toBe(404);
    expect(rawR2Key.status).toBe(404);
  });

  it("GET /media/cats/:publicId/vaccines/:vaccineId/sticker-photo is owner gated", async () => {
    const res = await worker.fetch(
      new Request("https://example.com/media/cats/MP-MX-0000-0000/vaccines/1/sticker-photo"),
      fakeEnv,
    );
    expect(res.status).toBe(401);
  });
});

describe("settings and reference route wiring", () => {
  it("GET /api/settings is auth gated", async () => {
    const res = await worker.fetch(new Request("https://example.com/api/settings"), fakeEnv);
    expect(res.status).toBe(401);
  });

  it("GET /api/cat-reference/breeds returns fallback reference data without a secret", async () => {
    const res = await worker.fetch(new Request("https://example.com/api/cat-reference/breeds"), fakeEnv);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("breeds");
    expect(body).not.toContain("THE_CAT_API_KEY");
  });
});

describe("Recovery Board route wiring", () => {
  it("GET /recovery-board routes to the implemented public board", async () => {
    const env = {
      ...fakeEnv,
      DB: {
        prepare: () => ({
          bind: () => ({
            all: async () => ({ results: [] }),
          }),
        }),
      } as unknown as D1Database,
    };
    const res = await worker.fetch(new Request("https://example.com/recovery-board"), env);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("Recovery Board");
  });
});

describe("scope guard route wiring", () => {
  it.each([
    "/whatsapp",
    "/travel",
    "/adoption",
    "/memorial",
  ])("%s is not wired as an implemented app route", async (path) => {
    const res = await worker.fetch(new Request(`https://example.com${path}`), fakeEnv);
    expect(res.status).toBe(404);
  });
});
