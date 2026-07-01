import { describe, expect, it } from "vitest";
import { generateQrSvg } from "../qr.js";

describe("generateQrSvg", () => {
  it("returns an inline SVG QR image without external service references", () => {
    const svg = generateQrSvg("https://mishipass.example.com/c/MP-MX-7X3B-9K21");

    expect(svg).toContain("<svg");
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label="QR code"');
    expect(svg).toContain("<rect");
    expect(svg).not.toMatch(/api\.qrserver|chart\.googleapis|quickchart|qrcode\.monkey|cdn/i);
    expect(svg).not.toContain("<script");
  });

  it("encodes different canonical public URLs into different SVG payloads", () => {
    const first = generateQrSvg("https://mishipass.example.com/c/MP-MX-7X3B-9K21");
    const second = generateQrSvg("https://mishipass.example.com/c/MP-US-A1B2-C3D4");

    expect(first).not.toBe(second);
  });
});
