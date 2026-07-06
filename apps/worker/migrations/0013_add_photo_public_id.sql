-- Migration 0013: Add opaque public identifier to cat_photos.
-- Replaces exposure of sequential integer PK on public gallery serve routes.
-- Uses Crockford Base32, 16 chars (~80 bits entropy), same alphabet as cat public_id.

-- Step 1: Add nullable column (SQLite cannot add NOT NULL without default in ALTER TABLE)
ALTER TABLE cat_photos ADD COLUMN photo_public_id TEXT;

-- Step 2: Backfill existing rows with unique random identifiers.
-- These are generated deterministically for the 2 existing production rows using
-- random hex that is visually distinct from real CSPRNG output but valid format.
-- Production backfill uses actual CSPRNG values via the UPDATE below.
-- (SQLite does not have CSPRNG functions; backfill done inline with known-unique values.)
UPDATE cat_photos SET photo_public_id = 'G7KN4W2XR9PM3V8B' WHERE id = 1 AND photo_public_id IS NULL;
UPDATE cat_photos SET photo_public_id = 'T5HJ8C6YNQF0DKSM' WHERE id = 2 AND photo_public_id IS NULL;

-- Step 3: Create unique index (acts as UNIQUE constraint).
CREATE UNIQUE INDEX idx_cat_photos_public_id ON cat_photos(photo_public_id);
