-- Tekrarlayan randevu desteği için sütunlar
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurring_group_id UUID;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurrence_index INTEGER;

CREATE INDEX IF NOT EXISTS idx_appointments_recurring_group ON appointments(recurring_group_id);
