-- Seed Data for Autism Support Platform
-- Kullanıcılar (Ebeveynler)
INSERT INTO users (id, email, full_name, password_hash, role, created_at, is_verified) VALUES 
(gen_random_uuid(), 'ayse.yilmaz@email.com', 'Ayşe Yılmaz', '$2a$10$w9oO//sUqP3XG.X/T0z.rODS7hA/T7OaK7y9zM6oB2Dk5Yv1K8dKq', 'PARENT', NOW() - INTERVAL '10 days', true),
(gen_random_uuid(), 'mehmet.demir@email.com', 'Mehmet Demir', '$2a$10$w9oO//sUqP3XG.X/T0z.rODS7hA/T7OaK7y9zM6oB2Dk5Yv1K8dKq', 'PARENT', NOW() - INTERVAL '8 days', true),
(gen_random_uuid(), 'zeynep.kaya@email.com', 'Zeynep Kaya', '$2a$10$w9oO//sUqP3XG.X/T0z.rODS7hA/T7OaK7y9zM6oB2Dk5Yv1K8dKq', 'PARENT', NOW() - INTERVAL '5 days', true),
(gen_random_uuid(), 'ali.can@email.com', 'Ali Can', '$2a$10$w9oO//sUqP3XG.X/T0z.rODS7hA/T7OaK7y9zM6oB2Dk5Yv1K8dKq', 'PARENT', NOW() - INTERVAL '3 days', true),
(gen_random_uuid(), 'fatma.sahin@email.com', 'Fatma Şahin', '$2a$10$w9oO//sUqP3XG.X/T0z.rODS7hA/T7OaK7y9zM6oB2Dk5Yv1K8dKq', 'PARENT', NOW() - INTERVAL '1 days', true);

-- Kullanıcılar (Uzmanlar)
INSERT INTO users (id, email, full_name, password_hash, role, expert_title, institution, license_number, bio, created_at, is_verified) VALUES 
(gen_random_uuid(), 'dr.kemal@autism.com', 'Dr. Kemal Aydın', '$2a$10$w9oO//sUqP3XG.X/T0z.rODS7hA/T7OaK7y9zM6oB2Dk5Yv1K8dKq', 'EXPERT', 'Çocuk Nöroloğu', 'Hacettepe Üniversitesi', 'TR-112233', 'Çocuk nörolojisi alanında 20 yıllık deneyim.', NOW() - INTERVAL '20 days', true),
(gen_random_uuid(), 'psikolog.elza@autism.com', 'Psk. Elza Çelik', '$2a$10$w9oO//sUqP3XG.X/T0z.rODS7hA/T7OaK7y9zM6oB2Dk5Yv1K8dKq', 'EXPERT', 'Uzman Klinik Psikolog', 'Özel Terapi Merkezi', 'TR-445566', 'Oyun terapisi ve otizm spektrum uzmanı.', NOW() - INTERVAL '15 days', true);

-- Çocuklar
INSERT INTO children (id, parent_id, name, birth_date, diagnosis_info, created_at) 
SELECT gen_random_uuid(), id, 'Can', '2018-05-12', 'Atipik Otizm', NOW() FROM users WHERE email = 'ayse.yilmaz@email.com';

INSERT INTO children (id, parent_id, name, birth_date, diagnosis_info, created_at) 
SELECT gen_random_uuid(), id, 'Elif', '2019-08-22', 'Asperger Sendromu', NOW() FROM users WHERE email = 'mehmet.demir@email.com';

INSERT INTO children (id, parent_id, name, birth_date, diagnosis_info, created_at) 
SELECT gen_random_uuid(), id, 'Efe', '2020-11-05', 'OSB', NOW() FROM users WHERE email = 'zeynep.kaya@email.com';

-- Forum Gönderileri (Her Ebeveynden 1 Tane)
INSERT INTO forum_posts (id, author_id, title, content, category, like_count, post_type, created_at, updated_at)
SELECT gen_random_uuid(), id, 'Çocuğumun uyku düzeni için tavsiyeleriniz neler?', 'Merhabalar, son 1 aydır gece uyanmaları çok arttı. Melatonin kullanan var mı? Varsa deneyimlerinizi paylaşabilir misiniz?', 'Günlük Yaşam', 12, 'DISCUSSION', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' FROM users WHERE email = 'ayse.yilmaz@email.com';

INSERT INTO forum_posts (id, author_id, title, content, category, like_count, post_type, created_at, updated_at)
SELECT gen_random_uuid(), id, 'Kreş seçimi yaparken nelere dikkat ediyorsunuz?', 'Otizmli çocuklar için kaynaştırma eğitimi veren devlet kreşleri mi yoksa özel eğitim merkezleri mi daha faydalı oluyor?', 'Eğitim', 8, 'QUESTION', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' FROM users WHERE email = 'mehmet.demir@email.com';

INSERT INTO forum_posts (id, author_id, title, content, category, like_count, post_type, created_at, updated_at)
SELECT gen_random_uuid(), id, 'Duyu bütünleme terapisi evde nasıl desteklenir?', 'Terapistimiz haftada 1 gün yeterli diyor ama evde desteklememizi istedi. Basit ve etkili duyu bütünleme materyalleri önerir misiniz?', 'Terapiler', 24, 'QUESTION', NOW() - INTERVAL '1 days', NOW() - INTERVAL '1 days' FROM users WHERE email = 'zeynep.kaya@email.com';

-- Forum Yorumları
INSERT INTO forum_comments (id, post_id, author_id, content, created_at)
SELECT gen_random_uuid(), p.id, u.id, 'Biz ağırlıklı battaniye kullanmaya başladık, uykuya geçiş süresini çok kısalttı. Tavsiye ederim.', NOW() - INTERVAL '1 days' 
FROM forum_posts p, users u 
WHERE p.title LIKE '%uyku düzeni%' AND u.email = 'zeynep.kaya@email.com';

INSERT INTO forum_comments (id, post_id, author_id, content, created_at)
SELECT gen_random_uuid(), p.id, u.id, 'Doktor kontrolü olmadan melatonin kullanmak riskli olabilir, mutlaka nöroloğunuza danışın.', NOW() - INTERVAL '12 hours' 
FROM forum_posts p, users u 
WHERE p.title LIKE '%uyku düzeni%' AND u.email = 'dr.kemal@autism.com';

-- Takvim Etkinlikleri
INSERT INTO calendar_events (id, child_id, title, description, start_time, event_type, created_at)
SELECT gen_random_uuid(), c.id, 'Duyu Bütünleme Terapisi', 'Ege Terapi Merkezi', NOW() + INTERVAL '2 days', 'THERAPY', NOW() FROM children c JOIN users u ON c.parent_id = u.id WHERE u.email = 'ayse.yilmaz@email.com';

INSERT INTO calendar_events (id, child_id, title, description, start_time, event_type, created_at)
SELECT gen_random_uuid(), c.id, 'Çocuk Psikiyatrisi Kontrolü', 'Dr. Kemal Aydın randevusu', NOW() + INTERVAL '5 days', 'APPOINTMENT', NOW() FROM children c JOIN users u ON c.parent_id = u.id WHERE u.email = 'ayse.yilmaz@email.com';
