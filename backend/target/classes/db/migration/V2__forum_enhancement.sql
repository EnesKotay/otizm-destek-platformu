-- Semptom etiket sistemi
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tags_category ON tags(category);

-- Cocuk-etiket iliskisi
CREATE TABLE child_tags (
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (child_id, tag_id)
);

CREATE INDEX idx_child_tags_child ON child_tags(child_id);
CREATE INDEX idx_child_tags_tag ON child_tags(tag_id);

-- Gonderi-etiket iliskisi
CREATE TABLE post_tags (
    post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX idx_post_tags_post ON post_tags(post_id);
CREATE INDEX idx_post_tags_tag ON post_tags(tag_id);

-- Oy sistemi
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL,
    target_id UUID NOT NULL,
    vote_value INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX idx_votes_target ON votes(target_type, target_id);
CREATE INDEX idx_votes_user ON votes(user_id);

-- Forum posts genisletme
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS post_type VARCHAR(30) NOT NULL DEFAULT 'DENEYIM';
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS is_answered BOOLEAN DEFAULT FALSE;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS accepted_answer_id UUID;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{"showRealName": true, "showChildAge": true, "showSymptoms": true, "showDiagnosis": false, "allowMatching": true}';

-- Forum comments genisletme
ALTER TABLE forum_comments ADD COLUMN IF NOT EXISTS vote_count INT DEFAULT 0;
ALTER TABLE forum_comments ADD COLUMN IF NOT EXISTS is_accepted BOOLEAN DEFAULT FALSE;

-- Onceden tanimli etiketler
INSERT INTO tags (name, category, description) VALUES
    -- ILETISIM
    ('Konuşma Gecikmesi', 'ILETISIM', 'Yaşına göre beklenen konuşma seviyesinin gerisinde kalma'),
    ('Sözel Olmayan İletişim', 'ILETISIM', 'Jest, mimik ve beden dili ile iletişim'),
    ('Ekolali', 'ILETISIM', 'Duyulan sözcük veya cümlelerin tekrarı'),
    ('Dil Gerilemesi', 'ILETISIM', 'Önceden kazanılan dil becerilerinin kaybı'),
    ('Zamirleri Ters Kullanma', 'ILETISIM', '''Ben'' yerine ''Sen'' veya üçüncü tekil şahıs kullanma'),
    ('Sözel Komutları Anlama Zorluğu', 'ILETISIM', 'İşitme sorunu olmamasına rağmen komutlara tepki vermeme'),
    ('Düz Ses Tonu', 'ILETISIM', 'Monoton, prosodi eksikliği veya robotik ses tonuyla konuşma'),
    ('Karşılıklı Sohbet Zorluğu', 'ILETISIM', 'Kendi ilgi alanları dışında sohbeti başlatma ve sürdürmede güçlük'),
    ('Mecazları Anlama Zorluğu', 'ILETISIM', 'Deyimleri, şakaları ve mecaz anlamları kelimesi kelimesine algılama'),
    
    -- SOSYAL
    ('Göz Teması Zorluğu', 'SOSYAL', 'Göz teması kurmada veya sürdürmede zorluk'),
    ('Sosyal İzolasyon', 'SOSYAL', 'Akranlarla etkileşimden kaçınma'),
    ('Oyun Becerileri', 'SOSYAL', 'Hayal gücü oyunu veya paylaşımlı oyun zorluğu'),
    ('Taklit Zorluğu', 'SOSYAL', 'Hareketleri veya sesleri taklit etmede zorluk'),
    ('Ortak Dikkat Eksikliği', 'SOSYAL', 'Bir nesneye/olaya ilgi çekmek için parmakla işaret etmeme'),
    ('Empati Kurma Zorluğu', 'SOSYAL', 'Başkalarının duygusal ipuçlarını anlama ve uygun tepki vermede güçlük'),
    ('Akran İlişkilerinde Güçlük', 'SOSYAL', 'Yaşıtlarıyla arkadaş edinme, sürdürme ve oyun kurmada zorluk'),
    ('Beden Dili Okuma Zorluğu', 'SOSYAL', 'Başkalarının jest, mimik ve duruşlarını yanlış anlama'),
    ('İsimle Seslenildiğinde Tepkisizlik', 'SOSYAL', 'Kendi ismine tutarlı bir şekilde yanıt vermeme'),

    -- DUYUSAL
    ('Duyusal Hassasiyet', 'DUYUSAL', 'Duyusal uyaranlara aşırı tepki'),
    ('Ses Hassasiyeti', 'DUYUSAL', 'Yüksek seslere veya belirli seslere aşırı tepki'),
    ('Doku Hassasiyeti', 'DUYUSAL', 'Belirli dokulara veya giysilere karşı hassasiyet'),
    ('Işık Hassasiyeti', 'DUYUSAL', 'Parlak ışıklara karşı hassasiyet'),
    ('Yeme Seçiciliği', 'DUYUSAL', 'Sınırlı yiyecek çeşidi ve yeme sorunları'),
    ('Koku ve Tat Hassasiyeti', 'DUYUSAL', 'Belirli kokulara karşı aşırı tepki ve yiyecek dokularına seçicilik'),
    ('Ağrı Hassasiyeti', 'DUYUSAL', 'Acıya karşı aşırı tepki verme veya hiç tepki vermeme'),
    ('Proprioseptif Arayış', 'DUYUSAL', 'Sıkıştırılma, ağır battaniye veya sertçe sarılma ihtiyacı'),
    ('Vestibüler İhtiyaç', 'DUYUSAL', 'Sürekli kendi etrafında dönme, sallanma veya zıplama ihtiyacı'),
    ('Görsel Uyaran Arayışı', 'DUYUSAL', 'Dönen nesnelere, tekerleklere veya ışıklara uzun süre odaklanma'),

    -- DAVRANIS
    ('Tekrarlayıcı Davranışlar', 'DAVRANIS', 'Stereotipik veya tekrarlayan hareketler'),
    ('Stereotipi', 'DAVRANIS', 'El çırpma, sallanma gibi tekrarlayan motor hareketler'),
    ('Rutin Bağımlılığı', 'DAVRANIS', 'Değişikliklere karşı direnme, rutinlere bağlı kalma'),
    ('Özkontrol Zorluğu', 'DAVRANIS', 'Duygu ve davranış düzenleme güçlüğü'),
    ('Uyku Problemleri', 'DAVRANIS', 'Uykuya dalma veya uyku sürekliliğinde zorluk'),
    ('Takıntı ve Özel İlgiler', 'DAVRANIS', 'Belirli konulara, nesnelere veya detaylara aşırı düzeyde odaklanma'),
    ('Kendi Kendine Zarar Verme', 'DAVRANIS', 'Öfke, kriz veya duyusal yüklenme anında kendine vurma, ısırma'),
    ('Meltdown / Duyusal Kriz', 'DAVRANIS', 'Aşırı duyusal veya duygusal yüklenme sonucu yaşanan patlama nöbetleri'),
    ('Tehlike Algısı Eksikliği', 'DAVRANIS', 'Korku hissetmeme, yola atlama veya tehlikeli durumlara girme eğilimi'),
    ('Hiperaktivite', 'DAVRANIS', 'Aşırı hareketlilik, yerinde duramama ve odaklanma güçlüğü'),

    -- MOTOR
    ('İnce Motor Zorluğu', 'MOTOR', 'Kalem tutma, düğme gibi ince motor becerilerde zorluk'),
    ('Kaba Motor Zorluğu', 'MOTOR', 'Koşma, zıplama gibi büyük kas hareketlerinde zorluk'),
    ('Koordinasyon', 'MOTOR', 'El-göz koordinasyonu ve denge problemleri'),
    ('Motor Planlama Zorluğu', 'MOTOR', 'Yeni motor hareketleri tasarlama ve ardışık yapmada güçlük'),
    ('Parmak Ucunda Yürüme', 'MOTOR', 'Topukları yere tam basmadan uzun süreli yürüme eğilimi'),
    ('Zayıf Kas Tonusu', 'MOTOR', 'Gevşek vücut duruşu ve çabuk yorulma'),
    ('El-Göz Koordinasyonu Zayıflığı', 'MOTOR', 'Top yakalama, fırlatma ve makas kullanma gibi becerilerde zorluk'),

    -- EGITIM
    ('Özel Eğitim', 'EGITIM', 'Bireyselleştirilmiş eğitim programı'),
    ('ABA Terapi', 'EGITIM', 'Uygulamalı Davranış Analizi terapisi'),
    ('Erişkin Yaşam Becerileri', 'EGITIM', 'Günlük yaşam ve öz bakım becerileri eğitimi'),
    ('Floortime Terapisi', 'EGITIM', 'Çocuğun liderliğini takip eden oyun ve etkileşim temelli terapi'),
    ('Duyu Bütünleme Terapisi', 'EGITIM', 'Duyusal işlemleme zorluklarına yönelik ergoterapi temelli destek'),
    ('Konuşma ve Dil Terapisi', 'EGITIM', 'İletişim, artikülasyon ve ifade edici dil becerileri desteği'),
    ('Ergoterapi', 'EGITIM', 'Günlük yaşam becerileri, bağımsızlık ve ince motor gelişimi'),
    ('PECS', 'EGITIM', 'Resim Değiş Tokuşuna Dayalı İletişim Sistemi')
ON CONFLICT (name) DO NOTHING;
