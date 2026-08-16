-- GENERATED FILE — do not edit by hand.
-- Source of truth for the fully-migrated D1 schema.
-- Regenerate with: node scripts/generate-schema-baseline.mjs
CREATE INDEX idx_cat_photos_cat_id
  ON cat_photos (cat_id);

CREATE UNIQUE INDEX idx_cat_photos_public_id ON cat_photos(photo_public_id);

CREATE INDEX idx_cats_public_id
  ON cats (public_id);

CREATE INDEX idx_missing_alerts_city
  ON missing_alerts (city);

CREATE INDEX idx_owner_identities_lookup
  ON owner_identities (provider, provider_sub);

CREATE INDEX idx_owner_identities_provider_email
  ON owner_identities (provider, email);

CREATE INDEX idx_sessions_token_hash
  ON sessions (token_hash);

CREATE INDEX idx_sighting_reports_cat_created
  ON sighting_reports (cat_id, created_at);

CREATE INDEX idx_transfer_requests_cat
  ON transfer_requests (cat_public_id, status);

CREATE INDEX idx_transfer_requests_current_owner
  ON transfer_requests (current_owner_id, status);

CREATE TABLE cat_photos (
  id         INTEGER PRIMARY KEY,
  cat_id     INTEGER NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  r2_key     TEXT    NOT NULL,
  is_profile INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
, is_public INTEGER NOT NULL DEFAULT 0, photo_public_id TEXT);

CREATE TABLE cats (
  id           INTEGER PRIMARY KEY,
  public_id    TEXT    NOT NULL UNIQUE,
  owner_id     INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  name         TEXT    NOT NULL,
  country_code TEXT    NOT NULL,
  photo_r2_key TEXT,
  current_mode TEXT    NOT NULL DEFAULT 'active',
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
, sex TEXT, birth_date TEXT, color_markings TEXT, breed_mix TEXT, weight TEXT, notes TEXT, deleted_at TEXT, next_vaccine_date TEXT, microchip_number TEXT, microchip_date TEXT);

CREATE TABLE contact_settings (
  id           INTEGER PRIMARY KEY,
  cat_id       INTEGER NOT NULL UNIQUE REFERENCES cats(id) ON DELETE CASCADE,
  contact_mode TEXT    NOT NULL DEFAULT 'relay',
  public_phone TEXT
);

CREATE TABLE medications (
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

CREATE TABLE missing_alerts (
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

CREATE TABLE owner_identities (
  id           INTEGER PRIMARY KEY,
  owner_id     INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  -- provider: e.g. "logto"
  provider     TEXT    NOT NULL,
  -- provider_sub: stable opaque subject from the OIDC provider (Logto sub claim)
  provider_sub TEXT    NOT NULL,
  -- email: last-known email from the identity provider; may change between logins
  email        TEXT,
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE(provider, provider_sub)
);

CREATE TABLE owner_settings (
  owner_id      INTEGER PRIMARY KEY REFERENCES owners(id) ON DELETE CASCADE,
  language_code TEXT    NOT NULL DEFAULT 'en',
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
, units TEXT NOT NULL DEFAULT 'metric');

CREATE TABLE owners (
  id            INTEGER PRIMARY KEY,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE rate_limits (
  key TEXT NOT NULL,
  window_start TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);

CREATE TABLE sessions (
  id          INTEGER PRIMARY KEY,
  token_hash  TEXT    NOT NULL UNIQUE,
  owner_id    INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  expires_at  TEXT    NOT NULL
);

CREATE TABLE sighting_reports (
  id               INTEGER PRIMARY KEY,
  cat_id           INTEGER NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  message          TEXT,
  photo_r2_key     TEXT,
  location_text    TEXT,
  reporter_ip_hash TEXT,
  created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
, lat REAL, lng REAL);

CREATE TABLE transfer_requests (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  cat_public_id       TEXT    NOT NULL,
  requester_owner_id  INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  current_owner_id    INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  status              TEXT    NOT NULL DEFAULT 'pending',  -- pending | accepted | declined
  message             TEXT,
  created_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  resolved_at         TEXT
);

CREATE TABLE vaccines (
  id                   INTEGER PRIMARY KEY,
  cat_id               INTEGER NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  vaccine_name         TEXT    NOT NULL,
  date_given           TEXT,
  sticker_photo_r2_key TEXT,
  created_at           TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
, next_due_date TEXT);

CREATE TABLE vet_sessions (
  id           INTEGER PRIMARY KEY,
  cat_id       INTEGER NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  token_hash   TEXT    UNIQUE,
  activated_at TEXT    NOT NULL,
  expires_at   TEXT    NOT NULL,
  status       TEXT    NOT NULL DEFAULT 'active'
);

CREATE TABLE vet_visits (
  id                 INTEGER PRIMARY KEY,
  cat_id             INTEGER NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  visit_date         TEXT,
  vet_or_clinic_name TEXT,
  notes              TEXT,
  created_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TRIGGER cats_updated_at
AFTER UPDATE ON cats
FOR EACH ROW WHEN OLD.updated_at = NEW.updated_at
BEGIN
  UPDATE cats
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
  WHERE id = NEW.id;
END;

CREATE TRIGGER owners_updated_at
AFTER UPDATE ON owners
FOR EACH ROW WHEN OLD.updated_at = NEW.updated_at
BEGIN
  UPDATE owners
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
  WHERE id = NEW.id;
END;
