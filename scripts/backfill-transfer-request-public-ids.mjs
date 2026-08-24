#!/usr/bin/env node
/**
 * Backfill public_id on transfer_requests rows that have NULL public_id.
 *
 * Run AFTER migration 0015 and BEFORE migration 0016.
 *
 * Usage:
 *   node scripts/backfill-transfer-request-public-ids.mjs --local
 *   node scripts/backfill-transfer-request-public-ids.mjs --db-path ./tmp-export.sqlite
 *   node scripts/backfill-transfer-request-public-ids.mjs --local --dry-run
 *
 * Flags:
 *   --local      Use wrangler's local D1 database path
 *   --db-path    Explicit path to a SQLite file
 *   --dry-run    Print what would be assigned without writing anything
 */

import { DatabaseSync } from "node:sqlite";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Public ID generation — identical logic to apps/worker/src/db/repositories/transferRequests.ts
// (CSPRNG source differs: Node crypto vs Web Crypto, but format is identical)
// ---------------------------------------------------------------------------

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function generateTransferPublicId() {
  const bytes = new Uint8Array(5); // 40 bits → 8 × 5-bit chars
  crypto.getRandomValues(bytes);
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  let s = "";
  for (let i = 0; i < 8; i++) {
    s = CROCKFORD[Number(n & 31n)] + s;
    n >>= 5n;
  }
  return `TR-${s}`;
}

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const useLocal = args.includes("--local");
const dryRun = args.includes("--dry-run");
const dbPathIdx = args.indexOf("--db-path");
const explicitPath = dbPathIdx !== -1 ? args[dbPathIdx + 1] : null;

if (!useLocal && !explicitPath) {
  console.error("Error: must specify --local or --db-path <path>");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Resolve SQLite path
// ---------------------------------------------------------------------------

let dbPath;

if (explicitPath) {
  dbPath = resolve(explicitPath);
} else {
  // Ask wrangler where the local D1 database lives
  let wranglerOutput;
  try {
    wranglerOutput = execSync(
      "npx wrangler d1 info mishipass --local --json",
      { encoding: "utf-8", cwd: resolve(import.meta.dirname, "../apps/worker") },
    );
  } catch {
    // Fallback: wrangler local D1 default path
    const candidate = resolve(
      import.meta.dirname,
      "../apps/worker/.wrangler/state/v3/d1/miniflare-D1DatabaseObject",
    );
    // Find the first .sqlite file under that dir
    try {
      const entries = execSync(`dir "${candidate}" /b /s /a-d`, { encoding: "utf-8" });
      const sqliteFile = entries.trim().split("\n").find((f) => f.trim().endsWith(".sqlite"));
      if (sqliteFile) {
        dbPath = sqliteFile.trim();
      }
    } catch {
      // ignore
    }
    if (!dbPath) {
      console.error(
        "Could not determine local D1 path automatically.\n" +
        "Use --db-path <path> and point it at the .sqlite file under\n" +
        "apps/worker/.wrangler/state/v3/d1/",
      );
      process.exit(1);
    }
  }

  if (!dbPath) {
    try {
      const info = JSON.parse(wranglerOutput);
      dbPath = info.location ?? info.file ?? info.path;
    } catch {
      console.error("Failed to parse wrangler d1 info output:\n" + wranglerOutput);
      process.exit(1);
    }
  }
}

if (!existsSync(dbPath)) {
  console.error(`SQLite file not found: ${dbPath}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Backfill
// ---------------------------------------------------------------------------

const db = new DatabaseSync(dbPath);

const nullRows = db
  .prepare("SELECT id FROM transfer_requests WHERE public_id IS NULL")
  .all();

if (nullRows.length === 0) {
  console.log("No rows with NULL public_id. Nothing to do.");
  if (dryRun) console.log("[dry-run] 0 rows would be assigned.");
  process.exit(0);
}

console.log(`Found ${nullRows.length} row(s) with NULL public_id.`);

let assigned = 0;
let failed = 0;

for (const row of nullRows) {
  let success = false;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const publicId = generateTransferPublicId();

    if (dryRun) {
      console.log(`[dry-run] row ${row.id} would be assigned ${publicId}`);
      success = true;
      break;
    }

    try {
      const result = db
        .prepare(
          "UPDATE transfer_requests SET public_id = ? WHERE id = ? AND public_id IS NULL",
        )
        .run(publicId, row.id);

      if (result.changes > 0) {
        console.log(`row ${row.id} assigned public_id ${publicId}`);
        success = true;
        break;
      }
    } catch (err) {
      if (attempt < 3 && err.message?.includes("UNIQUE")) {
        console.warn(`Collision on attempt ${attempt} for row ${row.id}, retrying...`);
        continue;
      }
      console.error(`Failed to assign public_id to row ${row.id}: ${err.message}`);
      break;
    }
  }

  if (success) {
    assigned++;
  } else {
    failed++;
  }
}

if (dryRun) {
  console.log(`[dry-run] ${nullRows.length} row(s) would be assigned.`);
  process.exit(0);
}

// Final verification
const remaining = db
  .prepare("SELECT COUNT(*) AS n FROM transfer_requests WHERE public_id IS NULL")
  .get();

if (remaining.n !== 0) {
  console.error(
    `ERROR: ${remaining.n} row(s) still have NULL public_id after backfill.`,
  );
  const unassigned = db
    .prepare("SELECT id FROM transfer_requests WHERE public_id IS NULL")
    .all();
  console.error("Unassigned IDs:", unassigned.map((r) => r.id).join(", "));
  process.exit(1);
}

console.log(`Backfill complete. ${assigned} assigned, ${failed} failed.`);
process.exit(failed > 0 ? 1 : 0);
