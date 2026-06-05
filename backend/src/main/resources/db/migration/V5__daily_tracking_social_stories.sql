-- İlaç takibi
CREATE TABLE IF NOT EXISTS medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    dosage VARCHAR(100),
    unit VARCHAR(50),
    frequency VARCHAR(50),
    scheduled_times JSONB,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    scheduled_time VARCHAR(10),
    taken BOOLEAN DEFAULT FALSE,
    taken_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Ruh hali takibi
CREATE TABLE IF NOT EXISTS mood_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    mood_level INT NOT NULL CHECK (mood_level BETWEEN 1 AND 5),
    notes TEXT,
    triggers JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Uyku takibi
CREATE TABLE IF NOT EXISTS sleep_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    sleep_date DATE NOT NULL,
    bedtime VARCHAR(10),
    wake_time VARCHAR(10),
    duration_minutes INT,
    quality INT CHECK (quality BETWEEN 1 AND 5),
    night_wakings INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sosyal hikayeler
CREATE TABLE IF NOT EXISTS social_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(300) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    pages JSONB NOT NULL DEFAULT '[]',
    is_public BOOLEAN DEFAULT FALSE,
    child_id UUID REFERENCES children(id) ON DELETE SET NULL,
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medications_child ON medications(child_id);
CREATE INDEX IF NOT EXISTS idx_med_logs_child_date ON medication_logs(child_id, log_date);
CREATE INDEX IF NOT EXISTS idx_mood_child_date ON mood_entries(child_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_sleep_child_date ON sleep_entries(child_id, sleep_date);
CREATE INDEX IF NOT EXISTS idx_stories_author ON social_stories(author_id);
CREATE INDEX IF NOT EXISTS idx_stories_public ON social_stories(is_public) WHERE is_public = TRUE;
