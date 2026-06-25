-- V32: Add side_effects JSONB column to medication_logs
ALTER TABLE medication_logs ADD COLUMN side_effects JSONB DEFAULT '[]'::jsonb;
