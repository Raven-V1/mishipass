import { describe, expect, it } from "vitest";
import worker, { type Env } from "../index.js";

const fakeEnv: Env = {
  DB: {} as D1Database,
  PUBLIC_BASE_URL: "https://mishipass.example.com",
};

const PUBLIC_SITE_URL = "https://raven-v1.github.io/mishipass/";
const FORBIDDEN_PUBLIC_TERMS = [
  "owner legal identity",
  "owner@example.com",
  "personal-account-subdomain",
  "personal-worker-url",
  "internal database ID",
];

describe("worker fetch routes", () => {
  it("GET / redirects to the public-facing MishiPass site", async () => {
    const res = await worker.fetch(new Request("https://example.com/"), fakeEnv);

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(PUBLIC_SITE_URL);
  });

  it("HEAD / redirects to the public-facing MishiPass site without a body", async () => {
    const res = await worker.fetch(new Request("https://example.com/", { method: "HEAD" }), fakeEnv);

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(PUBLIC_SITE_URL);
    expect(await res.text()).toBe("");
  });

  it("root redirect does not expose owner identity, private data, or personal runtime URL", async () => {
    const res = await worker.fetch(new Request("https://example.com/"), fakeEnv);
    const body = await res.text();
    const exposedText = `${res.headers.get("Location") ?? ""}\n${body}`;

    for (const term of FORBIDDEN_PUBLIC_TERMS) {
      expect(exposedText).not.toContain(term);
    }
    expect(exposedText).not.toContain("owner_id");
    expect(exposedText).not.toContain("dashboard");
    expect(exposedText).not.toContain("private cat data");
    expect(exposedText).not.toMatch(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
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
});
