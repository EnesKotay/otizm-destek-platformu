-- Add accepting_patients flag to users (experts can toggle this)
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepting_patients BOOLEAN NOT NULL DEFAULT TRUE;

-- Expert consultation cases (uzman-arası vaka danışma)
CREATE TABLE IF NOT EXISTS expert_consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    tags JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    reply_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expert_consultations_author ON expert_consultations(author_id);
CREATE INDEX IF NOT EXISTS idx_expert_consultations_status ON expert_consultations(status);
CREATE INDEX IF NOT EXISTS idx_expert_consultations_created ON expert_consultations(created_at DESC);

-- Replies to consultation cases
CREATE TABLE IF NOT EXISTS expert_consultation_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL REFERENCES expert_consultations(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultation_replies_consultation ON expert_consultation_replies(consultation_id);
