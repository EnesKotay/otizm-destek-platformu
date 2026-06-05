ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS session_notes TEXT,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS calendar_event_id UUID;
