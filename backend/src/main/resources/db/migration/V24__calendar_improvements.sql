-- Etkinlik durumu (PLANNED / COMPLETED / CANCELLED)
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'PLANNED';

-- Hatırlatma: etkinlikten kaç dakika önce bildirim gönderilsin (null = kapalı)
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS reminder_minutes_before INTEGER DEFAULT 60;

-- Konum bilgisi
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS location VARCHAR(255);

-- Hatırlatma bildirimi gönderildi mi?
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;

-- Status kısıtı
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_calendar_status') THEN
        ALTER TABLE calendar_events ADD CONSTRAINT chk_calendar_status
            CHECK (status IN ('PLANNED', 'COMPLETED', 'CANCELLED'));
    END IF;
END $$;

-- Performans indexleri
CREATE INDEX IF NOT EXISTS idx_calendar_child_start
    ON calendar_events(child_id, start_time);

CREATE INDEX IF NOT EXISTS idx_calendar_reminders
    ON calendar_events(start_time, reminder_sent)
    WHERE status = 'PLANNED' AND reminder_minutes_before IS NOT NULL AND reminder_sent = FALSE;
