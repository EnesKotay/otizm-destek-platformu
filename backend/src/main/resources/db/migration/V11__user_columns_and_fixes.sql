-- V11: User tablosuna eksik kolonları ekle + abc_entries nullable fix

-- ── Users tablosu: eksik kolonlar ─────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS expert_title       VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS city               VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS institution        VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number     VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio                TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS matching_enabled   BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active          BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude           DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude          DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS specializations    JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_verified   BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_verified_at TIMESTAMP;

-- ── abc_entries: category ve location nullable yap (model buna izin veriyor) ─
ALTER TABLE abc_entries ALTER COLUMN category DROP NOT NULL;
ALTER TABLE abc_entries ALTER COLUMN location DROP NOT NULL;

-- ── İndeksler ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_role       ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_city       ON users(city);
CREATE INDEX IF NOT EXISTS idx_users_is_active  ON users(is_active);
