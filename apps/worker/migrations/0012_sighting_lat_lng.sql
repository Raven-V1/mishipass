-- 0012: add optional lat/lng to sighting_reports
-- Stores the GPS coordinates clicked on the map at time of report.
-- Both columns are nullable — the map pin is optional.
ALTER TABLE sighting_reports ADD COLUMN lat REAL;
ALTER TABLE sighting_reports ADD COLUMN lng REAL;
