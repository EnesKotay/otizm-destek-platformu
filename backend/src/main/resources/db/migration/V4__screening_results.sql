CREATE TABLE IF NOT EXISTS screening_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    test_type VARCHAR(50) NOT NULL,
    score INT NOT NULL DEFAULT 0,
    risk_level VARCHAR(20) NOT NULL,
    answers JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_screening_child_id ON screening_results(child_id);
