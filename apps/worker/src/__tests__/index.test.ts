import { describe, expect, it } from "vitest";
import worker, { type Env } from "../index.js";

const fakeEnv: Env = {
  DB: {} as D1Database,
  PUBLIC_BASE_URL: "https://mishipass.example.com",
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
    expect(body).toContain('href="/dashboard"');
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
    expect(body).toContain("Select country...");
    expect(body).toContain('value="MX"');
    expect(body).toContain("Mexico (MX)");
  });

  it("contains Contact and Privacy UI controls", async () => {
    const res = await worker.fetch(new Request("https://example.com/dashboard"), fakeEnv);
    const body = await res.text();
    expect(body).toContain("Contact &amp; Privacy");
    expect(body).toContain("contact-mode-select");
    expect(body).toContain("Save contact settings");
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
});
