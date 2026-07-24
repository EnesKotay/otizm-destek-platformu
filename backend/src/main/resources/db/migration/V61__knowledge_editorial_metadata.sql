ALTER TABLE knowledge_articles
    ADD COLUMN IF NOT EXISTS source_author VARCHAR(300),
    ADD COLUMN IF NOT EXISTS source_publication VARCHAR(240),
    ADD COLUMN IF NOT EXISTS source_published_at DATE,
    ADD COLUMN IF NOT EXISTS source_accessed_at DATE,
    ADD COLUMN IF NOT EXISTS doi VARCHAR(160),
    ADD COLUMN IF NOT EXISTS license_type VARCHAR(40) NOT NULL DEFAULT 'UNKNOWN',
    ADD COLUMN IF NOT EXISTS usage_type VARCHAR(40) NOT NULL DEFAULT 'ORIGINAL',
    ADD COLUMN IF NOT EXISTS evidence_level VARCHAR(40) NOT NULL DEFAULT 'EXPERT_REVIEW',
    ADD COLUMN IF NOT EXISTS original_language VARCHAR(12) NOT NULL DEFAULT 'tr',
    ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS reviewed_by_id UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS review_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_knowledge_reviewed_by ON knowledge_articles(reviewed_by_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_evidence_level ON knowledge_articles(evidence_level);

-- Eski yayınlar yeniden editöryal kontrolden geçene kadar doğrulanmış sayılmaz.
UPDATE knowledge_articles
SET pending_review = TRUE,
    is_published = FALSE,
    license_type = CASE
        WHEN source_url IS NULL THEN 'ORIGINAL'
        ELSE 'UNKNOWN'
    END,
    usage_type = CASE
        WHEN source_url IS NULL THEN 'ORIGINAL'
        ELSE 'SUMMARY'
    END
WHERE reviewed_at IS NULL;
