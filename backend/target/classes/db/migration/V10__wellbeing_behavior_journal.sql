CREATE TABLE IF NOT EXISTS wellbeing_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    answers JSONB NOT NULL,
    score INT NOT NULL CHECK (score BETWEEN 0 AND 100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uk_wellbeing_user_date UNIQUE (user_id, entry_date)
);

CREATE TABLE IF NOT EXISTS abc_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    entry_time TIME,
    antecedent TEXT NOT NULL,
    behavior TEXT NOT NULL,
    consequence TEXT NOT NULL,
    intensity INT NOT NULL CHECK (intensity BETWEEN 1 AND 5),
    category VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wellbeing_user_date ON wellbeing_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_abc_child_date ON abc_entries(child_id, entry_date, entry_time);
