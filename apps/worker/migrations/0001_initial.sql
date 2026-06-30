-- MishiPass D1 initial schema — spec §2, §3
-- Migration: 0001_initial.sql (wrangler convention; spec §8 names it 000_ as placeholder)
--
-- D1 enforces foreign keys by default. Runtime PRAGMA foreign_keys is not
-- required. Future table-rebuild migrations may use PRAGMA defer_foreign_keys
-- only when needed.

-- NOTE: If this or any future migration file contains a trigger with a
-- BEGIN...END block, apply it with:
--   wrangler d1 execute <db-name> --remote --file=migrations/<this-file>.sql
-- NOT with `wrangler d1 migrations apply`, which splits on every semicolon
-- and breaks on the semicolons inside the trigger body. See decision-log.md,
-- entry dated 2026-06-29, for the full explanation.

-- ── owners ──────────────────────────────────────────────────────────────────
-- Credential store. Internal `id` is NEVER serialized to any client response.
-- email stored lowercased by the application layer before insert.
-- password_hash: PBKDF2-SHA256 via Web Crypto; salt + iteration params encoded
--   into the hash string (e.g. PHC / $pbkdf2-sha256$ format). Auth task sets
--   the iteration constant after benchmark; out of scope here.
CREATE TABLE IF NOT EXISTS owners (
  id            INTEGER PRIMARY KEY,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TRIGGER IF NOT EXISTS owners_updated_at
AFTER UPDATE ON owners
FOR EACH ROW WHEN OLD.updated_at = NEW.updated_at
BEGIN
  UPDATE owners
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
  WHERE id = NEW.id;
END;

-- ── sessions ─────────────────────────────────────────────────────────────────
-- Opaque token auth. Raw token is in the HttpOnly cookie only; only its
-- SHA-256 hash is stored. ON DELETE CASCADE removes sessions when owner deleted.
CREATE TABLE IF NOT EXISTS sessions (
  id          INTEGER PRIMARY KEY,
  token_hash  TEXT    NOT NULL UNIQUE,
  owner_id    INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  expires_at  TEXT    NOT NULL
);

-- ── cats ─────────────────────────────────────────────────────────────────────
-- One row per registered cat. `public_id` is the ONLY external identifier.
-- Internal `id` must never appear in any URL or response body.
-- UNIQUE(public_id) enables the retry-on-collision path (spec §2, §3).
-- current_mode is the single source of truth read on every QR scan (spec §1.5).
-- country_code is cosmetic display context only; no uniqueness contribution (spec §4).
CREATE TABLE IF NOT EXISTS cats (
  id           INTEGER PRIMARY KEY,
  public_id    TEXT    NOT NULL UNIQUE,
  owner_id     INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  name         TEXT    NOT NULL,
  country_code TEXT    NOT NULL,
  photo_r2_key TEXT,
  current_mode TEXT    NOT NULL DEFAULT 'active',
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- current_mode ENUM values: active | missing | vet | travel | adoption | memorial | celebration
-- SQLite has no native enum; the application layer enforces the allowed set.

CREATE TRIGGER IF NOT EXISTS cats_updated_at
AFTER UPDATE ON cats
FOR EACH ROW WHEN OLD.updated_at = NEW.updated_at
BEGIN
  UPDATE cats
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
  WHERE id = NEW.id;
END;

-- ── contact_settings ─────────────────────────────────────────────────────────
-- 1:1 with cats. Controls what finders see on the public QR profile.
-- Owner full name and exact address are intentionally NOT columns (spec §7).
-- contact_mode: relay | phone | none (default: relay — MishiPass relay form).
-- public_phone: only served when contact_mode = 'phone'.
CREATE TABLE IF NOT EXISTS contact_settings (
  id           INTEGER PRIMARY KEY,
  cat_id       INTEGER NOT NULL UNIQUE REFERENCES cats(id) ON DELETE CASCADE,
  contact_mode TEXT    NOT NULL DEFAULT 'relay',
  public_phone TEXT
);

-- ── missing_alerts ────────────────────────────────────────────────────────────
-- 1:1 with cats. reward and Recovery Board are opt-in; default private.
-- reward_visible: 0 = hidden, 1 = shown on public missing page.
-- recovery_board_opt_in: 0 = private, 1 = published to community board.
CREATE TABLE IF NOT EXISTS missing_alerts (
  id                    INTEGER PRIMARY KEY,
  cat_id                INTEGER NOT NULL UNIQUE REFERENCES cats(id) ON DELETE CASCADE,
  last_seen_at          TEXT,
  city                  TEXT,
  area                  TEXT,
  reward_amount         TEXT,
  reward_visible        INTEGER NOT NULL DEFAULT 0,
  recovery_board_opt_in INTEGER NOT NULL DEFAULT 0,
  activated_at          TEXT
);

-- ── sighting_reports ──────────────────────────────────────────────────────────
-- Public unauthenticated input. Raw reporter IP is NEVER stored.
-- reporter_ip_hash: HMAC-SHA256(raw_ip, REPORTER_IP_SECRET env var).
-- REPORTER_IP_SECRET must be distinct from the password pepper (spec §2.6).
-- Upload validation (MIME allow-list, magic bytes, size cap, rate limiting)
-- is enforced in the sighting route handler — Day 5 task (spec §6).
CREATE TABLE IF NOT EXISTS sighting_reports (
  id               INTEGER PRIMARY KEY,
  cat_id           INTEGER NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  message          TEXT,
  photo_r2_key     TEXT,
  location_text    TEXT,
  reporter_ip_hash TEXT,
  created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ── vet_sessions ──────────────────────────────────────────────────────────────
-- Temporary vet access window.
-- token_hash mirrors sessions.token_hash pattern (SHA-256 of raw token); nullable
-- because access may be purely mode-gated rather than token-based (spec §2.7 OPEN).
-- activated_at / expires_at are stored; ENFORCEMENT is the Worker's responsibility
-- (Day 7 task). Do NOT add expiry logic here until §23 open items q1/q2 are decided
-- and logged in docs/decision-log.md.
-- TODO (Day 7): decide token-vs-mode-gated (§9 q1) and expiry rule (§9 q2), then
--   implement enforcement in the vet_visit route handler.
CREATE TABLE IF NOT EXISTS vet_sessions (
  id           INTEGER PRIMARY KEY,
  cat_id       INTEGER NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  token_hash   TEXT    UNIQUE,
  activated_at TEXT    NOT NULL,
  expires_at   TEXT    NOT NULL,
  status       TEXT    NOT NULL DEFAULT 'active'
);

-- status ENUM: active | finished | expired (enforced by application layer)

-- ── cartilla tables ───────────────────────────────────────────────────────────
-- Private. Owner-dashboard only. NEVER joined into a public mode response.
-- See spec §3 and §4 (LOCKED). All access must enforce ownership via:
--   WHERE cat_id = (SELECT id FROM cats WHERE public_id = ? AND owner_id = ?)

-- vet_visits
CREATE TABLE IF NOT EXISTS vet_visits (
  id                 INTEGER PRIMARY KEY,
  cat_id             INTEGER NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  visit_date         TEXT,
  vet_or_clinic_name TEXT,
  notes              TEXT,
  created_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- vaccines
CREATE TABLE IF NOT EXISTS vaccines (
  id                   INTEGER PRIMARY KEY,
  cat_id               INTEGER NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  vaccine_name         TEXT    NOT NULL,
  date_given           TEXT,
  sticker_photo_r2_key TEXT,
  created_at           TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- medications — documentation only (spec §4 LOCKED)
-- Encoded by absence: no reminder_*, next_dose, interaction_*, or refill_* columns.
-- None may be added without a Carlos-approved re-scope logged in docs/decision-log.md.
CREATE TABLE IF NOT EXISTS medications (
  id              INTEGER PRIMARY KEY,
  cat_id          INTEGER NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  medication_name TEXT    NOT NULL,
  dose            TEXT,
  duration        TEXT,
  start_date      TEXT,
  prescriber_name TEXT,
  notes           TEXT,
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- ── indexes (spec §3) ────────────────────────────────────────────────────────
-- Hot path: every QR scan resolves through this index.
CREATE INDEX IF NOT EXISTS idx_cats_public_id
  ON cats (public_id);

-- Hot path: every authenticated request validates through this index.
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash
  ON sessions (token_hash);

-- Recovery Board city filter.
CREATE INDEX IF NOT EXISTS idx_missing_alerts_city
  ON missing_alerts (city);

-- Owner sightings inbox, ordered by time.
CREATE INDEX IF NOT EXISTS idx_sighting_reports_cat_created
  ON sighting_reports (cat_id, created_at);
