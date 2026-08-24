-- 0015: add public_id to transfer_requests
--
-- Resolves Constitution §7 LOCKED: "never expose internal database IDs."
-- The internal integer `id` was exposed in /api/transfer-requests/:id/accept
-- and /api/transfer-requests/:id/decline. This migration ONLY adds the column
-- and unique index. Existing rows are backfilled by
-- scripts/backfill-transfer-request-public-ids.mjs before migration 0016
-- adds NOT NULL.
--
-- Rollback: DROP INDEX transfer_requests_public_id_uidx;
--           ALTER TABLE transfer_requests DROP COLUMN public_id;

ALTER TABLE transfer_requests ADD COLUMN public_id TEXT;

CREATE UNIQUE INDEX transfer_requests_public_id_uidx
  ON transfer_requests(public_id)
  WHERE public_id IS NOT NULL;
