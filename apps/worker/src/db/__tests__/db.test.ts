/**
 * D1 access-layer integration tests.
 * Runs in the @cloudflare/vitest-pool-workers environment.
 * D1 is populated from migrations/ before each test file runs.
 *
 * Covers (per task requirements):
 *  1. Public-id lookup returns ONLY whitelisted public columns (no id, no cartilla).
 *  2. Cartilla reads require owner_id and return nothing for a non-owner.
 *  3. Insert/read round-trips for every table.
 *  4. UNIQUE(public_id) collision surfaces an error the caller can catch and retry.
 */

import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { applyD1Migrations, env } from "cloudflare:test";
import type { D1Migration } from "@cloudflare/vitest-pool-workers/config";
import {
  deleteSession,
  findLatestVetSession,
  findOwnerByEmail,
  findSessionByTokenHash,
  finishVetSession,
  getCatPublicProfile,
  getContactSettingsForOwner,
  getContactSettingsPublic,
  getMissingAlertForOwner,
  getMissingAlertPublic,
  insertCat,
  insertMedication,
  insertOwner,
  insertSession,
  insertSightingReport,
  insertVaccine,
  insertVetSession,
  insertVetVisit,
  listCatsForOwner,
  listMedications,
  listRecoveryBoardAlerts,
  listSightingReportsForOwner,
  listVaccines,
  listVetVisits,
  updateCatMode,
  updateCatPhoto,
  upsertContactSettings,
  upsertMissingAlert,
} from "../index.js";

// ---------------------------------------------------------------------------
// Type declaration so TypeScript knows what env.DB is
// ---------------------------------------------------------------------------
declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database;
    TEST_MIGRATIONS: D1Migration[];
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const OWNER_A_EMAIL = "owner-a@example.com";
const OWNER_B_EMAIL = "owner-b@example.com";
const FAKE_HASH = "$pbkdf2-sha256$600000$fakesalt$fakehash";
const PUBLIC_ID_A = "MP-MX-7X3B-9K21";
const PUBLIC_ID_B = "MP-US-A1B2-C3D4";
const NOW = new Date().toISOString();
const FUTURE = new Date(Date.now() + 3_600_000).toISOString();

/** Returns the internal owner id after insert. */
async function createOwner(email: string): Promise<number> {
  await insertOwner(env.DB, { email, password_hash: FAKE_HASH });
  const row = await findOwnerByEmail(env.DB, email);
  if (!row) throw new Error(`Owner ${email} not found after insert`);
  return row.id;
}

// ---------------------------------------------------------------------------
// Setup: apply migrations once, reset state before each test
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  // Delete in FK-safe order so cascades don't interfere with counting.
  await env.DB.prepare("DELETE FROM medications").run();
  await env.DB.prepare("DELETE FROM vaccines").run();
  await env.DB.prepare("DELETE FROM vet_visits").run();
  await env.DB.prepare("DELETE FROM vet_sessions").run();
  await env.DB.prepare("DELETE FROM sighting_reports").run();
  await env.DB.prepare("DELETE FROM missing_alerts").run();
  await env.DB.prepare("DELETE FROM contact_settings").run();
  await env.DB.prepare("DELETE FROM cats").run();
  await env.DB.prepare("DELETE FROM sessions").run();
  await env.DB.prepare("DELETE FROM owners").run();
});

// ---------------------------------------------------------------------------
// 1. owners + sessions round-trip
// ---------------------------------------------------------------------------

describe("owners", () => {
  it("inserts and retrieves by email", async () => {
    await insertOwner(env.DB, { email: OWNER_A_EMAIL, password_hash: FAKE_HASH });
    const row = await findOwnerByEmail(env.DB, OWNER_A_EMAIL);
    expect(row).not.toBeNull();
    expect(row!.email).toBe(OWNER_A_EMAIL);
    expect(row!.password_hash).toBe(FAKE_HASH);
    expect(typeof row!.id).toBe("number");
  });

  it("returns null for unknown email", async () => {
    expect(await findOwnerByEmail(env.DB, "nobody@example.com")).toBeNull();
  });

  it("rejects duplicate email", async () => {
    await insertOwner(env.DB, { email: OWNER_A_EMAIL, password_hash: FAKE_HASH });
    await expect(
      insertOwner(env.DB, { email: OWNER_A_EMAIL, password_hash: FAKE_HASH }),
    ).rejects.toThrow();
  });
});

describe("sessions", () => {
  it("inserts and retrieves by token hash", async () => {
    const ownerId = await createOwner(OWNER_A_EMAIL);
    const tokenHash = "sha256hashoftoken";
    await insertSession(env.DB, { token_hash: tokenHash, owner_id: ownerId, expires_at: FUTURE });
    const session = await findSessionByTokenHash(env.DB, tokenHash);
    expect(session).not.toBeNull();
    expect(session!.owner_id).toBe(ownerId);
    expect(session!.expires_at).toBe(FUTURE);
  });

  it("deletes session", async () => {
    const ownerId = await createOwner(OWNER_A_EMAIL);
    const tokenHash = "deletable-token-hash";
    await insertSession(env.DB, { token_hash: tokenHash, owner_id: ownerId, expires_at: FUTURE });
    await deleteSession(env.DB, tokenHash);
    expect(await findSessionByTokenHash(env.DB, tokenHash)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. cats: public profile returns only whitelisted columns
// ---------------------------------------------------------------------------

describe("cats — public profile", () => {
  it("returns only whitelisted public columns; no internal id, no cartilla", async () => {
    const ownerId = await createOwner(OWNER_A_EMAIL);
    await insertCat(env.DB, {
      public_id: PUBLIC_ID_A,
      owner_id: ownerId,
      name: "Mishi",
      country_code: "MX",
    });

    const profile = await getCatPublicProfile(env.DB, PUBLIC_ID_A);
    expect(profile).not.toBeNull();

    // Only these public columns should be present.
    expect(profile).toEqual({
      public_id: PUBLIC_ID_A,
      name: "Mishi",
      country_code: "MX",
      photo_r2_key: null,
      current_mode: "active",
      sex: null,
      birth_date: null,
      color_markings: null,
      breed_mix: null,
      weight: null,
    });

    // Explicitly assert internal fields are absent.
    expect((profile as unknown as Record<string, unknown>)["id"]).toBeUndefined();
    expect((profile as unknown as Record<string, unknown>)["owner_id"]).toBeUndefined();
    expect((profile as unknown as Record<string, unknown>)["notes"]).toBeUndefined();
    // Cartilla tables have no columns on this object; confirming via spot-checks.
    expect((profile as unknown as Record<string, unknown>)["password_hash"]).toBeUndefined();
    expect((profile as unknown as Record<string, unknown>)["vet_visits"]).toBeUndefined();
    expect((profile as unknown as Record<string, unknown>)["medications"]).toBeUndefined();
  });

  it("returns null for unknown public_id", async () => {
    expect(await getCatPublicProfile(env.DB, "MP-XX-0000-0000")).toBeNull();
  });

  it("lists owner's cats without internal ids", async () => {
    const ownerId = await createOwner(OWNER_A_EMAIL);
    await insertCat(env.DB, { public_id: PUBLIC_ID_A, owner_id: ownerId, name: "Mishi", country_code: "MX" });
    await insertCat(env.DB, { public_id: PUBLIC_ID_B, owner_id: ownerId, name: "Luna", country_code: "MX" });
    const cats = await listCatsForOwner(env.DB, ownerId);
    expect(cats).toHaveLength(2);
    for (const cat of cats) {
      expect((cat as unknown as Record<string, unknown>)["id"]).toBeUndefined();
      expect((cat as unknown as Record<string, unknown>)["owner_id"]).toBeUndefined();
    }
  });

  it("updateCatMode: succeeds for correct owner, returns false for wrong owner", async () => {
    const ownerA = await createOwner(OWNER_A_EMAIL);
    const ownerB = await createOwner(OWNER_B_EMAIL);
    await insertCat(env.DB, { public_id: PUBLIC_ID_A, owner_id: ownerA, name: "Mishi", country_code: "MX" });

    const updated = await updateCatMode(env.DB, PUBLIC_ID_A, ownerA, "missing");
    expect(updated).toBe(true);
    const profile = await getCatPublicProfile(env.DB, PUBLIC_ID_A);
    expect(profile!.current_mode).toBe("missing");

    // Owner B cannot change Owner A's cat.
    const rejected = await updateCatMode(env.DB, PUBLIC_ID_A, ownerB, "active");
    expect(rejected).toBe(false);
  });

  it("cat photo key persists privately while public view exposes only whitelisted fields", async () => {
    const ownerId = await createOwner(OWNER_A_EMAIL);
    await insertCat(env.DB, { public_id: PUBLIC_ID_A, owner_id: ownerId, name: "Mishi", country_code: "MX" });
    const rawKey = `cats/${PUBLIC_ID_A}/generated-private-key.jpg`;

    await updateCatPhoto(env.DB, PUBLIC_ID_A, ownerId, rawKey);

    const profile = await getCatPublicProfile(env.DB, PUBLIC_ID_A);
    expect(profile!.photo_r2_key).toBe(rawKey);
    expect((profile as unknown as Record<string, unknown>)["id"]).toBeUndefined();
    expect((profile as unknown as Record<string, unknown>)["owner_id"]).toBeUndefined();
    expect((profile as unknown as Record<string, unknown>)["notes"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 3. UNIQUE(public_id) collision
// ---------------------------------------------------------------------------

describe("cats — public_id uniqueness", () => {
  it("surfaces a catchable error on duplicate public_id", async () => {
    const ownerId = await createOwner(OWNER_A_EMAIL);
    await insertCat(env.DB, { public_id: PUBLIC_ID_A, owner_id: ownerId, name: "First", country_code: "MX" });

    // Second insert with same public_id must throw (UNIQUE constraint).
    // The caller catches this and retries with a fresh generate_id().
    await expect(
      insertCat(env.DB, { public_id: PUBLIC_ID_A, owner_id: ownerId, name: "Collision", country_code: "MX" }),
    ).rejects.toThrow(/UNIQUE constraint failed/i);
  });
});

// ---------------------------------------------------------------------------
// 4. contact_settings round-trip
// ---------------------------------------------------------------------------

describe("contact_settings", () => {
  it("upserts and retrieves public view", async () => {
    const ownerId = await createOwner(OWNER_A_EMAIL);
    await insertCat(env.DB, { public_id: PUBLIC_ID_A, owner_id: ownerId, name: "Mishi", country_code: "MX" });
    await upsertContactSettings(env.DB, PUBLIC_ID_A, ownerId, { contact_mode: "phone", public_phone: "+521234567890" });

    const view = await getContactSettingsPublic(env.DB, PUBLIC_ID_A);
    expect(view).not.toBeNull();
    expect(view!.contact_mode).toBe("phone");
    expect(view!.public_phone).toBe("+521234567890");
  });

  it("second upsert replaces first", async () => {
    const ownerId = await createOwner(OWNER_A_EMAIL);
    await insertCat(env.DB, { public_id: PUBLIC_ID_A, owner_id: ownerId, name: "Mishi", country_code: "MX" });
    await upsertContactSettings(env.DB, PUBLIC_ID_A, ownerId, { contact_mode: "phone", public_phone: "+52111" });
    await upsertContactSettings(env.DB, PUBLIC_ID_A, ownerId, { contact_mode: "relay" });

    const view = await getContactSettingsPublic(env.DB, PUBLIC_ID_A);
    expect(view!.contact_mode).toBe("relay");
  });

  it("wrong owner cannot read settings", async () => {
    const ownerA = await createOwner(OWNER_A_EMAIL);
    const ownerB = await createOwner(OWNER_B_EMAIL);
    await insertCat(env.DB, { public_id: PUBLIC_ID_A, owner_id: ownerA, name: "Mishi", country_code: "MX" });
    await upsertContactSettings(env.DB, PUBLIC_ID_A, ownerA, { contact_mode: "phone", public_phone: "+52111" });

    expect(await getContactSettingsForOwner(env.DB, PUBLIC_ID_A, ownerB)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. missing_alerts round-trip
// ---------------------------------------------------------------------------

describe("missing_alerts", () => {
  it("upserts, public view hides reward when reward_visible = 0", async () => {
    const ownerId = await createOwner(OWNER_A_EMAIL);
    await insertCat(env.DB, { public_id: PUBLIC_ID_A, owner_id: ownerId, name: "Mishi", country_code: "MX" });
    await upsertMissingAlert(env.DB, PUBLIC_ID_A, ownerId, {
      city: "Juárez",
      area: "Centro",
      reward_amount: "500",
      reward_visible: 0,
      activated_at: NOW,
    });

    const pub = await getMissingAlertPublic(env.DB, PUBLIC_ID_A);
    expect(pub).not.toBeNull();
    expect(pub!.city).toBe("Juárez");
    expect(pub!.reward_amount).toBeNull(); // hidden
  });

  it("public view exposes reward when reward_visible = 1", async () => {
    const ownerId = await createOwner(OWNER_A_EMAIL);
    await insertCat(env.DB, { public_id: PUBLIC_ID_A, owner_id: ownerId, name: "Mishi", country_code: "MX" });
    await upsertMissingAlert(env.DB, PUBLIC_ID_A, ownerId, { reward_amount: "1000", reward_visible: 1, activated_at: NOW });

    const pub = await getMissingAlertPublic(env.DB, PUBLIC_ID_A);
    expect(pub!.reward_amount).toBe("1000");
  });

  it("owner gets full alert; non-owner gets null", async () => {
    const ownerA = await createOwner(OWNER_A_EMAIL);
    const ownerB = await createOwner(OWNER_B_EMAIL);
    await insertCat(env.DB, { public_id: PUBLIC_ID_A, owner_id: ownerA, name: "Mishi", country_code: "MX" });
    await upsertMissingAlert(env.DB, PUBLIC_ID_A, ownerA, { city: "Juárez", activated_at: NOW });

    const ownerView = await getMissingAlertForOwner(env.DB, PUBLIC_ID_A, ownerA);
    expect(ownerView).not.toBeNull();
    expect(ownerView!.city).toBe("Juárez");

    const nonOwnerView = await getMissingAlertForOwner(env.DB, PUBLIC_ID_A, ownerB);
    expect(nonOwnerView).toBeNull();
  });

  it("Recovery Board returns only opt-in missing cats", async () => {
    const ownerId = await createOwner(OWNER_A_EMAIL);
    await insertCat(env.DB, { public_id: PUBLIC_ID_A, owner_id: ownerId, name: "Mishi", country_code: "MX" });
    await insertCat(env.DB, { public_id: PUBLIC_ID_B, owner_id: ownerId, name: "Luna", country_code: "MX" });

    // Only PUBLIC_ID_A opts in to the board.
    await upsertMissingAlert(env.DB, PUBLIC_ID_A, ownerId, { city: "Juárez", recovery_board_opt_in: 1, activated_at: NOW });
    await upsertMissingAlert(env.DB, PUBLIC_ID_B, ownerId, { city: "Juárez", recovery_board_opt_in: 0, activated_at: NOW });
    await updateCatMode(env.DB, PUBLIC_ID_A, ownerId, "missing");
    await updateCatMode(env.DB, PUBLIC_ID_B, ownerId, "missing");

    const board = await listRecoveryBoardAlerts(env.DB);
    expect(board).toHaveLength(1);
    expect(board[0]!.public_id).toBe(PUBLIC_ID_A);
    // Internal ids must not be present.
    expect((board[0] as unknown as Record<string, unknown>)["id"]).toBeUndefined();
    expect((board[0] as unknown as Record<string, unknown>)["owner_id"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 6. sighting_reports round-trip
// ---------------------------------------------------------------------------

describe("sighting_reports", () => {
  it("inserts and owner retrieves; non-owner gets empty array", async () => {
    const ownerA = await createOwner(OWNER_A_EMAIL);
    const ownerB = await createOwner(OWNER_B_EMAIL);
    await insertCat(env.DB, { public_id: PUBLIC_ID_A, owner_id: ownerA, name: "Mishi", country_code: "MX" });

    await insertSightingReport(env.DB, {
      catPublicId: PUBLIC_ID_A,
      message: "Saw near the park",
      location_text: "Parque Sauzal",
      reporter_ip_hash: "hmac-sha256-of-ip",
    });

    const ownerReports = await listSightingReportsForOwner(env.DB, PUBLIC_ID_A, ownerA);
    expect(ownerReports).toHaveLength(1);
    expect(ownerReports[0]!.message).toBe("Saw near the park");
    expect(ownerReports[0]!.location_text).toBe("Parque Sauzal");
    // reporter_ip_hash must not appear in the owner view.
    expect((ownerReports[0] as unknown as Record<string, unknown>)["reporter_ip_hash"]).toBeUndefined();

    const nonOwnerReports = await listSightingReportsForOwner(env.DB, PUBLIC_ID_A, ownerB);
    expect(nonOwnerReports).toHaveLength(0);
  });

  it("persists sighting photo keys for owner-only retrieval without exposing reporter IP hash", async () => {
    const ownerA = await createOwner(OWNER_A_EMAIL);
    await insertCat(env.DB, { public_id: PUBLIC_ID_A, owner_id: ownerA, name: "Mishi", country_code: "MX" });
    const photoKey = `sightings/${PUBLIC_ID_A}/generated-private-key.webp`;

    await insertSightingReport(env.DB, {
      catPublicId: PUBLIC_ID_A,
      message: "Photo attached",
      location_text: "CDMX",
      reporter_ip_hash: "hmac-sha256-of-ip",
      photo_r2_key: photoKey,
    });

    const reports = await listSightingReportsForOwner(env.DB, PUBLIC_ID_A, ownerA);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.photo_r2_key).toBe(photoKey);
    expect((reports[0] as unknown as Record<string, unknown>)["reporter_ip_hash"]).toBeUndefined();
    expect((reports[0] as unknown as Record<string, unknown>)["cat_id"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 7. vet_sessions round-trip
// ---------------------------------------------------------------------------

describe("vet_sessions", () => {
  it("inserts and retrieves latest vet session", async () => {
    const ownerId = await createOwner(OWNER_A_EMAIL);
    await insertCat(env.DB, { public_id: PUBLIC_ID_A, owner_id: ownerId, name: "Mishi", country_code: "MX" });
    await insertVetSession(env.DB, {
      catPublicId: PUBLIC_ID_A,
      ownerId,
      token_hash: null,
      activated_at: NOW,
      expires_at: FUTURE,
    });

    const session = await findLatestVetSession(env.DB, PUBLIC_ID_A);
    expect(session).not.toBeNull();
    expect(session!.status).toBe("active");
    expect(session!.expires_at).toBe(FUTURE);
    // Internal ids absent.
    expect((session as unknown as Record<string, unknown>)["id"]).toBeUndefined();
    expect((session as unknown as Record<string, unknown>)["cat_id"]).toBeUndefined();
  });

  it("finishVetSession marks the latest active session finished only for the owner", async () => {
    const ownerA = await createOwner(OWNER_A_EMAIL);
    const ownerB = await createOwner(OWNER_B_EMAIL);
    await insertCat(env.DB, { public_id: PUBLIC_ID_A, owner_id: ownerA, name: "Mishi", country_code: "MX" });
    await insertVetSession(env.DB, {
      catPublicId: PUBLIC_ID_A,
      ownerId: ownerA,
      token_hash: null,
      activated_at: NOW,
      expires_at: FUTURE,
    });

    expect(await finishVetSession(env.DB, PUBLIC_ID_A, ownerB)).toBe(false);
    expect((await findLatestVetSession(env.DB, PUBLIC_ID_A))!.status).toBe("active");

    expect(await finishVetSession(env.DB, PUBLIC_ID_A, ownerA)).toBe(true);
    expect((await findLatestVetSession(env.DB, PUBLIC_ID_A))!.status).toBe("finished");
  });
});

// ---------------------------------------------------------------------------
// 8. Cartilla: ownership-gated reads
// ---------------------------------------------------------------------------

describe("cartilla — vet_visits", () => {
  it("owner inserts and reads; non-owner reads empty", async () => {
    const ownerA = await createOwner(OWNER_A_EMAIL);
    const ownerB = await createOwner(OWNER_B_EMAIL);
    await insertCat(env.DB, { public_id: PUBLIC_ID_A, owner_id: ownerA, name: "Mishi", country_code: "MX" });

    await insertVetVisit(env.DB, PUBLIC_ID_A, ownerA, {
      visit_date: "2026-06-25",
      vet_or_clinic_name: "Clínica Felina Norte",
      notes: "Annual checkup",
    });

    const ownerVisits = await listVetVisits(env.DB, PUBLIC_ID_A, ownerA);
    expect(ownerVisits).toHaveLength(1);
    expect(ownerVisits[0]!.vet_or_clinic_name).toBe("Clínica Felina Norte");
    // cat_id must not be exposed.
    expect((ownerVisits[0] as unknown as Record<string, unknown>)["cat_id"]).toBeUndefined();

    const nonOwnerVisits = await listVetVisits(env.DB, PUBLIC_ID_A, ownerB);
    expect(nonOwnerVisits).toHaveLength(0);
  });

  it("wrong owner cannot insert vet visit", async () => {
    const ownerA = await createOwner(OWNER_A_EMAIL);
    const ownerB = await createOwner(OWNER_B_EMAIL);
    await insertCat(env.DB, { public_id: PUBLIC_ID_A, owner_id: ownerA, name: "Mishi", country_code: "MX" });

    // ownerB tries to write a vet visit for ownerA's cat — must fail.
    await expect(
      insertVetVisit(env.DB, PUBLIC_ID_A, ownerB, { notes: "Unauthorized" }),
    ).rejects.toThrow();
  });
});

describe("cartilla — vaccines", () => {
  it("owner inserts and reads; non-owner reads empty", async () => {
    const ownerA = await createOwner(OWNER_A_EMAIL);
    const ownerB = await createOwner(OWNER_B_EMAIL);
    await insertCat(env.DB, { public_id: PUBLIC_ID_A, owner_id: ownerA, name: "Mishi", country_code: "MX" });

    await insertVaccine(env.DB, PUBLIC_ID_A, ownerA, {
      vaccine_name: "Tricat",
      date_given: "2026-06-01",
    });

    const ownerVaccines = await listVaccines(env.DB, PUBLIC_ID_A, ownerA);
    expect(ownerVaccines).toHaveLength(1);
    expect(ownerVaccines[0]!.vaccine_name).toBe("Tricat");
    expect((ownerVaccines[0] as unknown as Record<string, unknown>)["cat_id"]).toBeUndefined();

    expect(await listVaccines(env.DB, PUBLIC_ID_A, ownerB)).toHaveLength(0);
  });
});

describe("cartilla — medications (documentation only)", () => {
  it("owner inserts and reads; non-owner reads empty", async () => {
    const ownerA = await createOwner(OWNER_A_EMAIL);
    const ownerB = await createOwner(OWNER_B_EMAIL);
    await insertCat(env.DB, { public_id: PUBLIC_ID_A, owner_id: ownerA, name: "Mishi", country_code: "MX" });

    await insertMedication(env.DB, PUBLIC_ID_A, ownerA, {
      medication_name: "Amoxicillin",
      dose: "50mg",
      duration: "7 days",
      start_date: "2026-06-20",
      prescriber_name: "Dr. Gómez",
    });

    const meds = await listMedications(env.DB, PUBLIC_ID_A, ownerA);
    expect(meds).toHaveLength(1);
    expect(meds[0]!.medication_name).toBe("Amoxicillin");
    // Confirm no advice/dosage-calc columns exist on the returned object.
    expect((meds[0] as unknown as Record<string, unknown>)["cat_id"]).toBeUndefined();
    expect((meds[0] as unknown as Record<string, unknown>)["reminder_at"]).toBeUndefined();
    expect((meds[0] as unknown as Record<string, unknown>)["next_dose"]).toBeUndefined();
    expect((meds[0] as unknown as Record<string, unknown>)["interaction_check"]).toBeUndefined();
    expect((meds[0] as unknown as Record<string, unknown>)["refill_at"]).toBeUndefined();

    expect(await listMedications(env.DB, PUBLIC_ID_A, ownerB)).toHaveLength(0);
  });
});
