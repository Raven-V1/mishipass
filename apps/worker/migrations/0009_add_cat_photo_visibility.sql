-- 0009: per-photo public/private visibility for cat gallery.
-- Default 0 (private). Owner opts each photo into public visibility.
-- Public profile route MUST filter to is_public = 1 server-side.
ALTER TABLE cat_photos ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0;