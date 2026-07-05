-- Migration 0010: Add microchip fields to cats table
-- Microchip number and implant date are optional owner-entered data.
-- These fields are private (owner dashboard only) except when shown on
-- the Missing Alert public page (microchip_number only, if owner opts in).

ALTER TABLE cats ADD COLUMN microchip_number TEXT;
ALTER TABLE cats ADD COLUMN microchip_date TEXT;
