-- V13 bu sütunları zaten iceriyor; taze DB'de appointments henuz yoksa atla
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointments') THEN
        ALTER TABLE appointments ADD COLUMN IF NOT EXISTS session_notes TEXT;
        ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
        ALTER TABLE appointments ADD COLUMN IF NOT EXISTS calendar_event_id UUID;
    END IF;
END $$;
