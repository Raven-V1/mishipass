-- Move next-vaccine ownership into vaccine records while preserving legacy cat fallback.
ALTER TABLE vaccines ADD COLUMN next_due_date TEXT;
