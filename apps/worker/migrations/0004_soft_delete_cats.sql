-- MishiPass D1 migration: soft-delete for cats
-- Additive only. No data loss.
ALTER TABLE cats ADD COLUMN deleted_at TEXT;
