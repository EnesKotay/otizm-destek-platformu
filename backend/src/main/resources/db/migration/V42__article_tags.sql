CREATE TABLE article_tags (
    article_id UUID NOT NULL REFERENCES knowledge_articles(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
);

CREATE INDEX idx_article_tags_article ON article_tags(article_id);
CREATE INDEX idx_article_tags_tag ON article_tags(tag_id);

-- Link seed articles to predefined tags
-- 1. Otizmde Dil ve Konuşma Terapisi (Giriş Rehberi) -> Konuşma Gecikmesi, Ekolali, Sözel Olmayan İletişim
INSERT INTO article_tags (article_id, tag_id)
SELECT a.id, t.id
FROM knowledge_articles a, tags t
WHERE a.title = 'Otizmde Dil ve Konuşma Terapisi (Giriş Rehberi)'
  AND t.name IN ('Konuşma Gecikmesi', 'Ekolali', 'Sözel Olmayan İletişim');

-- 2. Duyusal Hassasiyetler ve Evde Çözüm Yolları -> Duyusal Hassasiyet, Ses Hassasiyeti, Doku Hassasiyeti
INSERT INTO article_tags (article_id, tag_id)
SELECT a.id, t.id
FROM knowledge_articles a, tags t
WHERE a.title = 'Duyusal Hassasiyetler ve Evde Çözüm Yolları'
  AND t.name IN ('Duyusal Hassasiyet', 'Ses Hassasiyeti', 'Doku Hassasiyeti');

-- 3. Sosyal Becerileri Oyunla Geliştirmek -> Oyun Becerileri, Akran İlişkilerinde Güçlük, Göz Teması Zorluğu
INSERT INTO article_tags (article_id, tag_id)
SELECT a.id, t.id
FROM knowledge_articles a, tags t
WHERE a.title = 'Sosyal Becerileri Oyunla Geliştirmek'
  AND t.name IN ('Oyun Becerileri', 'Akran İlişkilerinde Güçlük', 'Göz Teması Zorluğu');

-- 4. Otizmde Alternatif ve Destekleyici İletişim (AAC) -> Sözel Olmayan İletişim, Dil Gerilemesi
INSERT INTO article_tags (article_id, tag_id)
SELECT a.id, t.id
FROM knowledge_articles a, tags t
WHERE a.title = 'Otizmde Alternatif ve Destekleyici İletişim (AAC)'
  AND t.name IN ('Sözel Olmayan İletişim', 'Dil Gerilemesi');

-- 5. Öfke Nöbeti (Meltdown) ile Başa Çıkma Rehberi -> Meltdown / Duyusal Kriz, Özkontrol Zorluğu
INSERT INTO article_tags (article_id, tag_id)
SELECT a.id, t.id
FROM knowledge_articles a, tags t
WHERE a.title = 'Öfke Nöbeti (Meltdown) ile Başa Çıkma Rehberi'
  AND t.name IN ('Meltdown / Duyusal Kriz', 'Özkontrol Zorluğu');

-- 6. Duyusal Diyet Nedir ve Nasıl Uygulanır? -> Proprioseptif Arayış, Vestibüler İhtiyaç
INSERT INTO article_tags (article_id, tag_id)
SELECT a.id, t.id
FROM knowledge_articles a, tags t
WHERE a.title = 'Duyusal Diyet Nedir ve Nasıl Uygulanır?'
  AND t.name IN ('Proprioseptif Arayış', 'Vestibüler İhtiyaç');
