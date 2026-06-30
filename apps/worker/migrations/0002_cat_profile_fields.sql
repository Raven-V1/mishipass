-- Add expanded cat identity/profile fields.
-- These are optional display fields; existing cats get NULL defaults.
ALTER TABLE cats ADD COLUMN sex TEXT;
ALTER TABLE cats ADD COLUMN birth_date TEXT;
ALTER TABLE cats ADD COLUMN color_markings TEXT;
ALTER TABLE cats ADD COLUMN breed_mix TEXT;
ALTER TABLE cats ADD COLUMN weight TEXT;
ALTER TABLE cats ADD COLUMN notes TEXT;
