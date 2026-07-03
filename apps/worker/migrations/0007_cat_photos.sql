-- MishiPass D1 migration: cat_photos table
-- Migration: 0007_cat_photos.sql
--
-- Adds a photo gallery per cat. Exactly one photo per cat is the profile photo
-- (is_profile = 1), enforced in application logic. Raw R2 keys are never
-- exposed to clients.

CREATE TABLE IF NOT EXISTS cat_photos (
  id         INTEGER PRIMARY KEY,
  cat_id     INTEGER NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  r2_key     TEXT    NOT NULL,
  is_profile INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_cat_photos_cat_id
  ON cat_photos (cat_id);

-- Migrate existing single-photo data into the new table.
-- Any cat that has a photo_r2_key gets a row in cat_photos with is_profile = 1.
INSERT INTO cat_photos (cat_id, r2_key, is_profile)
  SELECT id, photo_r2_key, 1
  FROM cats
  WHERE photo_r2_key IS NOT NULL;
