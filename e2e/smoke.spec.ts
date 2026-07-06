import { test, expect } from "@playwright/test";

// Smoke tests for worker routes. Requires `wrangler dev` running on :8787.
// Most tests hit unauthenticated surfaces; auth-required routes are checked
// for correct rejection only (no real session is established here).

test.describe("public pages", () => {
  test("GET / returns 200 HTML", async ({ request }) => {
    const res = await request.get("/");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/html");
  });

  test("GET /dashboard returns 200 HTML", async ({ request }) => {
    const res = await request.get("/dashboard");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/html");
  });

  test("GET /recovery-board returns 200 HTML", async ({ request }) => {
    const res = await request.get("/recovery-board");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/html");
  });
});

test.describe("public cat profile", () => {
  test("GET /c/<unknown-id> returns 404", async ({ request }) => {
    const res = await request.get("/c/MP-XX-0000-0000");
    expect(res.status()).toBe(404);
  });
});

test.describe("unauthenticated API rejection", () => {
  test("GET /api/cats without session returns 401", async ({ request }) => {
    const res = await request.get("/api/cats");
    expect(res.status()).toBe(401);
  });

  test("POST /api/cats without session returns 401", async ({ request }) => {
    const res = await request.post("/api/cats", { data: {} });
    expect(res.status()).toBe(401);
  });
});

test.describe("sighting form", () => {
  test("GET /c/<unknown-id>/sighting returns 404", async ({ request }) => {
    const res = await request.get("/c/MP-XX-0000-0000/sighting");
    expect(res.status()).toBe(404);
  });
});

test.describe("404 fallback", () => {
  test("unknown route returns 404 HTML", async ({ request }) => {
    const res = await request.get("/nonexistent-path-xyz");
    expect(res.status()).toBe(404);
    expect(res.headers()["content-type"]).toContain("text/html");
  });
});
