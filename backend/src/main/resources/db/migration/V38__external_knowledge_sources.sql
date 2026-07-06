ALTER TABLE knowledge_articles
    ADD COLUMN source_name VARCHAR(120),
    ADD COLUMN source_url VARCHAR(500),
    ADD COLUMN pending_review BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX idx_knowledge_source_url ON knowledge_articles(source_url) WHERE source_url IS NOT NULL;
