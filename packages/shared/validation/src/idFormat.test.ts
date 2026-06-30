import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generateId, parseId, validateId } from "./idFormat.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const vectorsPath = path.resolve(
  __dirname,
  "../../../../tools/python/validation/test_vectors.json"
);

interface Vectors {
  valid: string[];
  invalid: Array<{ value: string; reason: string }>;
}

const vectors: Vectors = JSON.parse(readFileSync(vectorsPath, "utf-8"));

// ── Cross-language parity ──────────────────────────────────────────────────

describe("cross-language parity against test_vectors.json", () => {
  for (const id of vectors.valid) {
    it(`accepts valid: ${id}`, () => {
      expect(validateId(id)).toBe(true);
    });
  }

  for (const { value, reason } of vectors.invalid) {
    it(`rejects invalid (${reason}): ${JSON.stringify(value)}`, () => {
      expect(validateId(value)).toBe(false);
    });
  }
});

// ── generateId ─────────────────────────────────────────────────────────────

describe("generateId", () => {
  it("returns a string that passes validateId", () => {
    const id = generateId("MX");
    expect(validateId(id)).toBe(true);
  });

  it("embeds the country code verbatim", () => {
    const id = generateId("DE");
    expect(id.startsWith("MP-DE-")).toBe(true);
  });

  it("throws on lowercase country code", () => {
    expect(() => generateId("mx")).toThrow();
  });

  it("throws on single-letter country code", () => {
    expect(() => generateId("M")).toThrow();
  });

  it("throws on three-letter country code", () => {
    expect(() => generateId("MEX")).toThrow();
  });

  it("throws on empty string", () => {
    expect(() => generateId("")).toThrow();
  });

  it("throws on country code with digit", () => {
    expect(() => generateId("M1")).toThrow();
  });

  it("produces unique IDs across repeated calls", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateId("MX")));
    expect(ids.size).toBe(50);
  });
});

// ── parseId ────────────────────────────────────────────────────────────────

describe("parseId", () => {
  it("parses a valid ID into components", () => {
    const parsed = parseId("MP-MX-7X3B-9K21");
    expect(parsed).toEqual({
      prefix: "MP",
      country: "MX",
      seg1: "7X3B",
      seg2: "9K21",
    });
  });

  it("throws on an invalid ID", () => {
    expect(() => parseId("MP-MX-7X3B")).toThrow();
  });

  it("throws on empty string", () => {
    expect(() => parseId("")).toThrow();
  });
});
