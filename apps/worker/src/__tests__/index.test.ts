import { describe, expect, it } from "vitest";
import worker, { type Env } from "../index.js";

const fakeEnv: Env = {
  DB: {} as D1Database,
  PUBLIC_BASE_URL: "https://mishipass.example.com",
};

describe("worker fetch routes", () => {
  it("GET / returns a judge-safe MishiPass landing page", async () => {
    const res = await worker.fetch(new Request("https://example.com/"), fakeEnv);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/html; charset=UTF-8");

    const body = await res.text();
    expect(body).toContain("MishiPass");
    expect(body).toContain("privacy-first dynamic QR passport and recovery system for cats");
    expect(body).toContain("/c/MP-XX-XXXX-XXXX");
    expect(body).toContain("/c/MP-MX-7X3B-9K21");
  });

  it("GET / does not expose owner identity or email-shaped text", async () => {
    const res = await worker.fetch(new Request("https://example.com/"), fakeEnv);
    const body = await res.text();

    expect(body).not.toContain("Carlos Velazquez");
    expect(body).not.toContain("Carlos Erick");
    expect(body).not.toContain("carlosvelazquez354");
    expect(body).not.toMatch(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
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
