#!/usr/bin/env node
// -- GENERATED FILE -- do not edit by hand.
// Regenerate with: node scripts/generate-schema-baseline.mjs
import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const migrationsDir = path.join(repoRoot, "apps", "worker", "migrations");
const outputPath = path.join(repoRoot, "apps", "worker", "src", "db", "schema.sql");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mishipass-schema-"));
const dbPath = path.join(tmpDir, "schema.db");

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

  fs.writeFileSync(outputPath, header + body + "\n");
  console.log(`Schema baseline written to ${outputPath} (${rows.length} objects)`);
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
