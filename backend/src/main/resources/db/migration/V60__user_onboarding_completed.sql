-- Başlangıç (onboarding) ekranının tamamlanma durumu artık sunucuda tutulur.
-- Böylece kullanıcı farklı cihazdan/tarayıcıdan girse bile ekran yalnızca 1 kez gösterilir.
ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Mevcut kullanıcılar onboarding'i tekrar görmesin diye tamamlanmış sayılır.
UPDATE users SET onboarding_completed = TRUE;
