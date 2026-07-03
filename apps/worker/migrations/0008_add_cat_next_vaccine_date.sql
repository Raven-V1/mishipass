-- Add next_vaccine_date column to cats.
-- Owner-set documentation-only date. No reminders, no notifications.
ALTER TABLE cats ADD COLUMN next_vaccine_date TEXT;
