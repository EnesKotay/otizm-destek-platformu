ALTER TABLE knowledge_articles
    ADD COLUMN IF NOT EXISTS source_name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS source_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS pending_review BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_source_url ON knowledge_articles(source_url) WHERE source_url IS NOT NULL;
