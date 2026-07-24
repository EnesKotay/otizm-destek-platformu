-- format/media_url were never added by a migration on fresh databases (same ad-hoc
-- ddl-auto history gap as buddy_relationships in V33).
ALTER TABLE knowledge_articles
    ADD COLUMN IF NOT EXISTS format VARCHAR(50) NOT NULL DEFAULT 'TEXT',
    ADD COLUMN IF NOT EXISTS media_url VARCHAR(500);

-- Frontend used to encode video/podcast type as a "[MEDIA:type:url]" prefix inside the content
-- column instead of using the dedicated format/media_url columns. Backfill those columns from
-- the prefix and strip it out of content now that the frontend reads format/media_url directly.
UPDATE knowledge_articles
SET format = CASE
        WHEN content ~ '^\[MEDIA:video:' THEN 'VIDEO'
        WHEN content ~ '^\[MEDIA:podcast:' THEN 'PODCAST'
        ELSE format
    END,
    media_url = CASE
        WHEN content ~ '^\[MEDIA:(video|podcast):' AND (media_url IS NULL OR media_url = '')
            THEN substring(content from '^\[MEDIA:(?:video|podcast):([^\]]+)\]')
        ELSE media_url
    END,
    content = CASE
        WHEN content ~ '^\[MEDIA:(video|podcast):'
            THEN regexp_replace(content, '^\[MEDIA:(?:video|podcast):[^\]]+\]\n?', '')
        ELSE content
    END
WHERE content ~ '^\[MEDIA:(video|podcast):';
