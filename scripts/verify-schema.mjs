#!/usr/bin/env node
import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const migrationsDir = path.join(repoRoot, "apps", "worker", "migrations");
const committedPath = path.join(repoRoot, "apps", "worker", "src", "db", "schema.sql");

function generateSchema() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mishipass-verify-"));
  const dbPath = path.join(tmpDir, "verify.db");
  try {
    const db = new Database(dbPath);
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith(".sql"))
      .sort();
    for (const file of migrationFiles) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      try {
        db.exec(sql);
      } catch (err) {
        console.error(`Migration failed: ${file}`);
        console.error(err.message);
        process.exit(1);
      }
    }
    const rows = db.prepare(
      `SELECT type, name, sql FROM sqlite_master
       WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'
       ORDER BY type, name`,
    ).all();
    db.close();
    return rows;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function formatRows(rows) {
  const header = [
    "-- GENERATED FILE — do not edit by hand.",
    "-- Source of truth for the fully-migrated D1 schema.",
    "-- Regenerate with: node scripts/generate-schema-baseline.mjs",
    "",
  ].join("\n");
  const body = rows.map(row => {
    let sql = String(row.sql).trimEnd();
    if (!sql.endsWith(";")) sql += ";";
    return sql;
  }).join("\n\n");
  return header + body + "\n";
}

function unifiedDiff(a, b) {
  const linesA = a.split("\n");
  const linesB = b.split("\n");
  const diff = [];
  const maxLen = Math.max(linesA.length, linesB.length);
  for (let i = 0; i < maxLen; i++) {
    const la = linesA[i] ?? "(missing)";
    const lb = linesB[i] ?? "(missing)";
    if (la !== lb) {
      diff.push(`line ${i + 1}:`);
      diff.push(`  - ${la}`);
      diff.push(`  + ${lb}`);
    }
  }
  return diff.join("\n");
}

const rows = generateSchema();

// Fail-loud guard: fresh migration must produce tables
if (rows.length === 0) {
  console.error("SCHEMA VERIFY: fresh migration produced zero tables; refusing to trust output");
  process.exit(2);
}

// Fail-loud guard: committed schema.sql must be substantial
const committed = fs.readFileSync(committedPath, "utf8");
if (committed.length < 1000) {
  console.error("SCHEMA VERIFY: committed schema.sql is under 1000 bytes; refusing to trust output");
  process.exit(2);
}

const regenerated = formatRows(rows);

// Fail-loud guard: regenerated schema must also be substantial
if (regenerated.length < 1000) {
  console.error("SCHEMA VERIFY: regenerated schema is under 1000 bytes; refusing to trust output");
  process.exit(2);
}

// Normalize line endings then compare
const normalize = s => s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
const committedNorm = normalize(committed);
const regeneratedNorm = normalize(regenerated);

if (committedNorm === regeneratedNorm) {
  console.log(`SCHEMA VERIFY: OK (${rows.length} tables, ${regenerated.length} bytes)`);
  process.exit(0);
} else {
  const diff = unifiedDiff(committedNorm, regeneratedNorm);
  process.stderr.write("--- committed apps/worker/src/db/schema.sql\n+++ regenerated\n" + diff + "\n");
  console.error("SCHEMA VERIFY: DRIFT DETECTED — regenerate with 'node scripts/generate-schema-baseline.mjs'");
  process.exit(1);
}
