import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ALPHABET, generateId, parseId, validateId } from "./idFormat.js";

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

// -- Alphabet coverage: every ALPHABET char accepted, I/L/O/U rejected ------

describe("ALPHABET coverage vs validateId regex", () => {
  it("accepts every character in ALPHABET in each segment position", () => {
    const chars = new Set(ALPHABET.split(""));
    expect(chars.size).toBe(32);

    for (const ch of chars) {
      // Place the character in seg1 position 1 and seg2 position 1
      const id = `MP-MX-${ch}000-${ch}000`;
      expect(validateId(id)).toBe(true);
    }
  });

  it("rejects I, L, O, and U specifically in segment positions", () => {
    for (const excluded of ["I", "L", "O", "U"]) {
      const id = `MP-MX-${excluded}000-${excluded}000`;
      expect(validateId(id)).toBe(false);
    }
  });
});
