-- Owner-level settings for dashboard preferences.
-- Language preference is owner-private and affects owner dashboard/settings copy only.

CREATE TABLE IF NOT EXISTS owner_settings (
  owner_id      INTEGER PRIMARY KEY REFERENCES owners(id) ON DELETE CASCADE,
  language_code TEXT    NOT NULL DEFAULT 'en',
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
