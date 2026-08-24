-- 0013: add public_id to transfer_requests
--
-- Resolves Constitution §7 LOCKED: "never expose internal database IDs."
-- The internal integer `id` was exposed in /api/transfer-requests/:id/accept
-- and /api/transfer-requests/:id/decline. This migration adds a public_id
-- column and a unique index so the routes can use public_id instead.
--
-- Existing rows receive a legacy placeholder. New rows receive a generated
-- TR-XXXXXXXX public ID at insert time (see repositories/transferRequests.ts).

ALTER TABLE transfer_requests ADD COLUMN public_id TEXT;

UPDATE transfer_requests
  SET public_id = 'TR-LEGACY-' || CAST(id AS TEXT)
  WHERE public_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transfer_requests_public_id
  ON transfer_requests (public_id);
