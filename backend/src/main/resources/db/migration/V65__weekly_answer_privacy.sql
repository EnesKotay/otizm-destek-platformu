ALTER TABLE weekly_answers ADD COLUMN IF NOT EXISTS anonymous BOOLEAN NOT NULL DEFAULT FALSE;
-- Eski istemci "şehrimi gizle" seçimini kaydetmediği için mevcut yanıtların
-- şehir bilgisini güvenli tarafta kalarak varsayılan olarak gizle.
ALTER TABLE weekly_answers ADD COLUMN IF NOT EXISTS hide_city BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE weekly_answers ALTER COLUMN hide_city SET DEFAULT FALSE;
ALTER TABLE weekly_answers ADD COLUMN IF NOT EXISTS tags VARCHAR(255);

ALTER TABLE weekly_questions ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;
UPDATE weekly_questions SET published_at = created_at WHERE active = TRUE AND published_at IS NULL;
