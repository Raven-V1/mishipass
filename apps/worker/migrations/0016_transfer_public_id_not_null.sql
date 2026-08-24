-- 0016: enforce NOT NULL on transfer_requests.public_id
--
-- Must run AFTER scripts/backfill-transfer-request-public-ids.mjs has
-- populated all rows. SQLite requires table rebuild for NOT NULL retrofit.
--
-- Rollback: recreate the table without the NOT NULL constraint.

-- Verify all rows are backfilled before rebuild
-- (Manual check by operator; migration cannot conditionally halt)

CREATE TABLE transfer_requests_new (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  public_id           TEXT    NOT NULL UNIQUE,
  cat_public_id       TEXT    NOT NULL,
  requester_owner_id  INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  current_owner_id    INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  message             TEXT,
  status              TEXT    NOT NULL DEFAULT 'pending',
  created_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  resolved_at         TEXT
);

INSERT INTO transfer_requests_new
  (id, public_id, cat_public_id, requester_owner_id, current_owner_id,
   message, status, created_at, resolved_at)
SELECT id, public_id, cat_public_id, requester_owner_id, current_owner_id,
       message, status, created_at, resolved_at
FROM transfer_requests;

DROP INDEX IF EXISTS transfer_requests_public_id_uidx;
DROP TABLE transfer_requests;
ALTER TABLE transfer_requests_new RENAME TO transfer_requests;
