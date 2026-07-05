-- 0011: adoption transfer requests + units preference
--
-- transfer_requests: tracks when a new owner requests a cat in adoption mode.
-- units: stores owner's preferred unit system (metric / imperial).

CREATE TABLE IF NOT EXISTS transfer_requests (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  cat_public_id       TEXT    NOT NULL,
  requester_owner_id  INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  current_owner_id    INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  status              TEXT    NOT NULL DEFAULT 'pending',  -- pending | accepted | declined
  message             TEXT,
  created_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  resolved_at         TEXT
);

CREATE INDEX IF NOT EXISTS idx_transfer_requests_current_owner
  ON transfer_requests (current_owner_id, status);

CREATE INDEX IF NOT EXISTS idx_transfer_requests_cat
  ON transfer_requests (cat_public_id, status);

ALTER TABLE owner_settings ADD COLUMN units TEXT NOT NULL DEFAULT 'metric';
