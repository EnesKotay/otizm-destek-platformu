-- ── KVKK Uyum Altyapısı ──────────────────────────────────────────────────────
-- 1) emergency_cards tablosu hiçbir migration'da yoktu (yalnızca ddl-auto ile
--    oluşmuş). Taze bir veritabanında JPA_DDL_AUTO=validate ile açılış çökerdi.
-- 2) Rıza kayıt defteri: KVKK md. 5/6 ispat yükü için değiştirilemez geçmiş.
-- 3) İlgili kişi başvuruları: KVKK md. 11 hakları, md. 13 otuz günlük süre.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS emergency_cards (
    id         uuid PRIMARY KEY,
    child_id   uuid NOT NULL UNIQUE,
    user_id    uuid NOT NULL,
    data       jsonb,
    updated_at timestamp
);

-- Acil durum kartı paylaşımı: eskiden oturum açan herkes çocuk kimliğini
-- bilerek kartı okuyabiliyordu. Artık kart yalnızca ebeveyn açıkça paylaşıma
-- açtığında ve süreli bir jetonla okunabilir.
ALTER TABLE emergency_cards
    ADD COLUMN IF NOT EXISTS share_enabled    boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS share_token      varchar(64),
    ADD COLUMN IF NOT EXISTS share_expires_at timestamp;

CREATE UNIQUE INDEX IF NOT EXISTS uq_emergency_cards_share_token
    ON emergency_cards(share_token) WHERE share_token IS NOT NULL;

-- ── Rıza kayıt defteri (append-only) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consent_records (
    id             uuid PRIMARY KEY,
    user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type   varchar(64) NOT NULL,
    granted        boolean NOT NULL,
    policy_version varchar(32) NOT NULL,
    ip_address     varchar(64),
    user_agent     varchar(512),
    source         varchar(64),
    created_at     timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consent_records_user ON consent_records(user_id, consent_type, created_at DESC);

-- Aydınlatma metni sürümü: metin değiştiğinde yeniden rıza istenebilmesi için.
ALTER TABLE users ADD COLUMN IF NOT EXISTS kvkk_policy_version varchar(32);

-- Mevcut kullanıcıların rızalarını deftere taşı; geçmiş boş kalmasın.
-- Sürüm bilinmediği için "1.0-legacy" ile işaretlenir, böylece güncel metne
-- yeniden rıza istenmesi gerektiği ayırt edilebilir.
INSERT INTO consent_records (id, user_id, consent_type, granted, policy_version, source, created_at)
SELECT gen_random_uuid(), u.id, 'KVKK_AYDINLATMA', true, '1.0-legacy', 'BACKFILL',
       COALESCE(u.kvkk_consent_date, u.created_at, CURRENT_TIMESTAMP)
FROM users u
WHERE u.kvkk_consent IS TRUE
  AND NOT EXISTS (SELECT 1 FROM consent_records c WHERE c.user_id = u.id AND c.consent_type = 'KVKK_AYDINLATMA');

INSERT INTO consent_records (id, user_id, consent_type, granted, policy_version, source, created_at)
SELECT gen_random_uuid(), u.id, 'AI_ANALIZ', true, '1.0-legacy', 'BACKFILL',
       COALESCE(u.consent_ai_analysis_date, u.created_at, CURRENT_TIMESTAMP)
FROM users u
WHERE u.consent_ai_analysis IS TRUE
  AND NOT EXISTS (SELECT 1 FROM consent_records c WHERE c.user_id = u.id AND c.consent_type = 'AI_ANALIZ');

INSERT INTO consent_records (id, user_id, consent_type, granted, policy_version, source, created_at)
SELECT gen_random_uuid(), u.id, 'ACIL_DURUM_KARTI', true, '1.0-legacy', 'BACKFILL',
       COALESCE(u.consent_emergency_card_date, u.created_at, CURRENT_TIMESTAMP)
FROM users u
WHERE u.consent_emergency_card IS TRUE
  AND NOT EXISTS (SELECT 1 FROM consent_records c WHERE c.user_id = u.id AND c.consent_type = 'ACIL_DURUM_KARTI');

UPDATE users SET kvkk_policy_version = '1.0-legacy' WHERE kvkk_consent IS TRUE AND kvkk_policy_version IS NULL;

-- ── İlgili kişi başvuruları (KVKK md. 11 / md. 13) ───────────────────────────
CREATE TABLE IF NOT EXISTS data_subject_requests (
    id            uuid PRIMARY KEY,
    user_id       uuid REFERENCES users(id) ON DELETE SET NULL,
    request_type  varchar(48) NOT NULL,
    status        varchar(24) NOT NULL DEFAULT 'ACIK',
    contact_email varchar(255) NOT NULL,
    description   text NOT NULL,
    response      text,
    due_at        timestamp NOT NULL,
    resolved_at   timestamp,
    handled_by    uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at    timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dsr_status_due ON data_subject_requests(status, due_at);
CREATE INDEX IF NOT EXISTS idx_dsr_user ON data_subject_requests(user_id, created_at DESC);
