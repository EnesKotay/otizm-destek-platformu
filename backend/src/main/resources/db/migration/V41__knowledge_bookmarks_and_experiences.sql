-- Yer imleri (Bookmarks) tablosu oluşturulması
CREATE TABLE IF NOT EXISTS knowledge_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES knowledge_articles(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Bir kullanıcı bir makaleyi yalnızca bir kez favorilere ekleyebilir
CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_bookmarks_user_article ON knowledge_bookmarks(user_id, article_id);

-- Yorumlar tablosuna yapılandırılmış deneyim paylaşımı sütunlarının eklenmesi
ALTER TABLE article_comments
    ADD COLUMN IF NOT EXISTS is_experience BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS duration_tried VARCHAR(50),
    ADD COLUMN IF NOT EXISTS effectiveness_rating INT CHECK (effectiveness_rating BETWEEN 1 AND 5);
