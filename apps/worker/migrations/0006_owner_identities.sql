-- MishiPass D1 migration 0006 — owner_identities table
--
-- Maps OIDC provider subject identifiers (e.g. Logto sub claim) to MishiPass
-- owner accounts.  Enables Google and Apple login via Logto without requiring
-- a password on the owners row.
--
-- owners.password_hash remains NOT NULL; rows created through OIDC are
-- written with the sentinel '!' — a value that verifyPassword() will safely
-- reject because it does not match the $pbkdf2-sha256$ prefix format.  This
-- is the standard Unix /etc/shadow convention for locked-password accounts.
--
-- Apply with:
--   wrangler d1 execute mishipass --remote --file=migrations/0006_owner_identities.sql
-- (not with `wrangler d1 migrations apply` — see decision-log.md entry on
--  trigger / semicolon splitting).

CREATE TABLE IF NOT EXISTS owner_identities (
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

CREATE INDEX IF NOT EXISTS idx_owner_identities_lookup
  ON owner_identities (provider, provider_sub);

-- Secondary index for email-based linking (used when a new OIDC login matches
-- an existing email/password owner).
CREATE INDEX IF NOT EXISTS idx_owner_identities_provider_email
  ON owner_identities (provider, email);
