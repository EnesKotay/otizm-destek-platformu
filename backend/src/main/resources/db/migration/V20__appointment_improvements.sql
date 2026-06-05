-- Soft delete
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Late cancellation flag (randevu saatine 24 saatten az kalmışken iptal)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS late_cancellation BOOLEAN NOT NULL DEFAULT FALSE;

-- İptali gerçekleştiren kişi (PARENT / EXPERT / SYSTEM)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancellation_by VARCHAR(20);

-- Status geçerlilik kısıtı
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_appointment_status') THEN
        ALTER TABLE appointments ADD CONSTRAINT chk_appointment_status
            CHECK (status IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'BLOCKED'));
    END IF;
END $$;

-- Tip geçerlilik kısıtı
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_appointment_type') THEN
        ALTER TABLE appointments ADD CONSTRAINT chk_appointment_type
            CHECK (type IN ('FACE_TO_FACE', 'ONLINE'));
    END IF;
END $$;

-- Performans indexleri
CREATE INDEX IF NOT EXISTS idx_appointments_expert_status
    ON appointments(expert_id, status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_expert_date_active
    ON appointments(expert_id, appointment_date)
    WHERE status IN ('PENDING', 'CONFIRMED') AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_soft_deleted
    ON appointments(deleted_at) WHERE deleted_at IS NOT NULL;

-- Çift rezervasyon önleyici benzersiz kısıtlar (race-condition koruması)
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_no_double_pending
    ON appointments(expert_id, appointment_date, appointment_time)
    WHERE status = 'PENDING' AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_no_double_confirmed
    ON appointments(expert_id, appointment_date, appointment_time)
    WHERE status = 'CONFIRMED' AND deleted_at IS NULL;
