import { describe, expect, it } from "vitest";
import { hmacSha256Hex, sha256Hex } from "../crypto.js";

describe("crypto helpers", () => {
  it("HMAC-SHA256 is deterministic for the same IP and secret", async () => {
    const first = await hmacSha256Hex("203.0.113.10", "secret-a");
    const second = await hmacSha256Hex("203.0.113.10", "secret-a");

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain("203.0.113.10");
  });

  it("HMAC-SHA256 changes when the secret changes", async () => {
    const first = await hmacSha256Hex("203.0.113.10", "secret-a");
    const second = await hmacSha256Hex("203.0.113.10", "secret-b");

    expect(first).not.toBe(second);
  });

  it("plain SHA-256 remains available only as a generic digest helper", async () => {
    const digest = await sha256Hex("session-token");
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).not.toContain("session-token");
  });
});
