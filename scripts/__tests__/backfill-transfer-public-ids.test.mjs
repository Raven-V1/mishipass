/**
 * Tests for backfill-transfer-request-public-ids.mjs
 *
 * Uses node:test and node:sqlite (Node 22+).
 * Creates a temporary SQLite database in memory for each test.
 *
 * Run: node --test scripts/__tests__/backfill-transfer-public-ids.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SCRIPT = resolve(import.meta.dirname, "../backfill-transfer-request-public-ids.mjs");

// Build a minimal transfer_requests schema (post-migration-0015: public_id nullable)
function createDb(path) {
  const db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE transfer_requests (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      public_id           TEXT,
      cat_public_id       TEXT NOT NULL DEFAULT 'MP-MX-TEST-0001',
      requester_owner_id  INTEGER NOT NULL DEFAULT 1,
      current_owner_id    INTEGER NOT NULL DEFAULT 2,
      status              TEXT NOT NULL DEFAULT 'pending',
      created_at          TEXT NOT NULL DEFAULT '2026-01-01T00:00:00Z'
    );
    CREATE UNIQUE INDEX transfer_requests_public_id_uidx
      ON transfer_requests(public_id)
      WHERE public_id IS NOT NULL;
  `);
  return db;
}

function tempDbPath() {
  const dir = mkdtempSync(join(tmpdir(), "mishipass-test-"));
  return join(dir, "test.sqlite");
}

function runScript(dbPath, extraArgs = []) {
  try {
    const output = execFileSync(
      process.execPath,
      [SCRIPT, "--db-path", dbPath, ...extraArgs],
      { encoding: "utf-8" },
    );
    return { code: 0, output };
  } catch (err) {
    return { code: err.status ?? 1, output: err.stdout + err.stderr };
  }
}

// TR-XXXXXXXX: "TR-" followed by exactly 8 Crockford Base32 characters
const TR_FORMAT = /^TR-[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{8}$/;

test("backfill: assigns TR-XXXXXXXX public_id to 3 NULL rows and exits 0", () => {
  const dbPath = tempDbPath();
  const db = createDb(dbPath);
  db.exec("INSERT INTO transfer_requests DEFAULT VALUES");
  db.exec("INSERT INTO transfer_requests DEFAULT VALUES");
  db.exec("INSERT INTO transfer_requests DEFAULT VALUES");
  db.close();

  const { code, output } = runScript(dbPath);

  assert.equal(code, 0, `Script exited with ${code}:\n${output}`);

  const db2 = new DatabaseSync(dbPath);
  const rows = db2.prepare("SELECT public_id FROM transfer_requests").all();
  db2.close();

  assert.equal(rows.length, 3);
  for (const row of rows) {
    assert.match(row.public_id, TR_FORMAT, `public_id ${row.public_id} does not match TR format`);
  }

  // All IDs must be distinct
  const ids = rows.map((r) => r.public_id);
  assert.equal(new Set(ids).size, 3, "public_ids are not unique");
});

test("backfill idempotency: exits 0 and reports nothing to do when all rows already assigned", () => {
  const dbPath = tempDbPath();
  const db = createDb(dbPath);
  db.prepare("INSERT INTO transfer_requests (public_id) VALUES (?)").run("TR-AAAAAAAA");
  db.close();

  const { code, output } = runScript(dbPath);

  assert.equal(code, 0, `Script exited with ${code}:\n${output}`);
  assert.ok(output.includes("Nothing to do") || output.includes("0 row"), `Unexpected output: ${output}`);
});

test("backfill --dry-run: does not write to database", () => {
  const dbPath = tempDbPath();
  const db = createDb(dbPath);
  db.exec("INSERT INTO transfer_requests DEFAULT VALUES");
  db.exec("INSERT INTO transfer_requests DEFAULT VALUES");
  db.close();

  const { code, output } = runScript(dbPath, ["--dry-run"]);

  assert.equal(code, 0, `Script exited with ${code}:\n${output}`);
  assert.ok(output.includes("dry-run"), `Expected dry-run output, got: ${output}`);

  // Database must be unchanged — all rows still NULL
  const db2 = new DatabaseSync(dbPath);
  const rows = db2.prepare("SELECT public_id FROM transfer_requests").all();
  db2.close();

  for (const row of rows) {
    assert.equal(row.public_id, null, `--dry-run should not have written public_id, got: ${row.public_id}`);
  }
});

test("generateTransferPublicId format matches worker implementation contract", () => {
  // Verify the format produced by the generator matches TR-XXXXXXXX.
  // We cannot import the script directly (it is ESM with side effects),
  // so we assert via a roundtrip: run with 1 null row and check the assigned value.
  const dbPath = tempDbPath();
  const db = createDb(dbPath);
  db.exec("INSERT INTO transfer_requests DEFAULT VALUES");
  db.close();

  const { code } = runScript(dbPath);
  assert.equal(code, 0);

  const db2 = new DatabaseSync(dbPath);
  const row = db2.prepare("SELECT public_id FROM transfer_requests WHERE id = 1").get();
  db2.close();

  assert.match(
    row.public_id,
    TR_FORMAT,
    `Generated ID "${row.public_id}" does not match TR-[Crockford×8] format`,
  );
});
