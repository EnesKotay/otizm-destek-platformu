ALTER TABLE children
    ALTER COLUMN diagnosis_info TYPE TEXT,
    ALTER COLUMN education_program TYPE TEXT,
    ALTER COLUMN therapies TYPE TEXT;

ALTER TABLE development_notes ALTER COLUMN title TYPE TEXT;
ALTER TABLE screening_results ALTER COLUMN answers TYPE TEXT USING answers::text;
-- bep_reports taze veritabanlarında hiçbir migration'da oluşturulmamıştı (aynı eksik geçmiş sorunu).
CREATE TABLE IF NOT EXISTS bep_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id),
    created_by UUID NOT NULL REFERENCES users(id),
    student_name TEXT NOT NULL,
    diagnosis TEXT,
    performance TEXT,
    goals TEXT,
    school_year VARCHAR(255),
    shared_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE bep_reports
    ALTER COLUMN student_name TYPE TEXT,
    ALTER COLUMN goals TYPE TEXT USING goals::text;
ALTER TABLE messages ALTER COLUMN content TYPE TEXT;

-- Existing plaintext remains readable and is encrypted the next time each entity is written.
-- A separate online backfill job can rewrite untouched rows without downtime.
