-- V62'de bağımsız olarak yeniden yazılan platform başlangıç metinleri kaynaklardan
-- alınmış çeviri/alıntı değildir. Bağlantılar bilgi dayanağı olarak kalır.
UPDATE knowledge_articles
SET usage_type = 'ORIGINAL', license_type = 'ORIGINAL',
    review_notes = 'Platformun özgün anlatımı; kaynak bağlantısı bilgi dayanağıdır. Telif ve klinik doğruluk için periyodik editör kontrolü gerekir.'
WHERE title IN (
    'Otizmde Alternatif ve Destekleyici İletişim Yöntemleri (PECS)',
    'Otizm Spektrumunda Öfke Nöbetleri (Meltdown) ile Baş Etme',
    'Uygulamalı Davranış Analizi (ABA) Nedir?',
    'Otizmli Çocuklarda Uyku Problemleri ve Çözüm Önerileri',
    'Otizm ve Beslenme: Glütensiz ve Kazeinsiz Diyetler',
    'Evde Yapılabilecek Basit Duyu Bütünleme Aktiviteleri',
    'Otizm Spektrum Bozukluğu Nedir? İlk Belirtiler Nelerdir?',
    'Otizmde Dil ve Konuşma Terapisi Süreci'
)
AND usage_type = 'SUMMARY'
AND review_notes IS NOT NULL;

-- Diğer kapalı/belirsiz lisanslı yeniden kullanım kayıtları açık kalmasın.
UPDATE knowledge_articles
SET is_published = FALSE, pending_review = TRUE,
    reviewed_by_id = NULL, reviewed_at = NULL,
    review_notes = 'Yeniden yayımlama hakkı doğrulanana veya içerik özgün olarak yeniden yazılana kadar yayından kaldırıldı.'
WHERE is_published = TRUE
  AND usage_type <> 'ORIGINAL'
  AND license_type NOT IN ('PUBLIC_DOMAIN', 'CC_BY', 'CC_BY_SA');

-- Artık bulunmayan başlangıç bağlantılarını erişilebilir kaynak sayfalarıyla değiştir.
UPDATE knowledge_articles SET source_url = 'https://tohumotizm.org.tr/otizm-nedir/egitim-terapi-ve-tedavi-uygulamalari/', source_accessed_at = CURRENT_DATE
WHERE title IN ('Otizmde Alternatif ve Destekleyici İletişim Yöntemleri (PECS)', 'Uygulamalı Davranış Analizi (ABA) Nedir?')
  AND source_url IN ('https://tohumotizm.org.tr/bilgi-bankasi/pecs-nedir', 'https://tohumotizm.org.tr/bilgi-bankasi/aba-tedavisi');

UPDATE knowledge_articles SET source_url = 'https://www.autismspeaks.org/tool-kit-excerpt/planning-crisis', source_accessed_at = CURRENT_DATE
WHERE title = 'Otizm Spektrumunda Öfke Nöbetleri (Meltdown) ile Baş Etme'
  AND source_url = 'https://www.autismspeaks.org/meltdown-management';

UPDATE knowledge_articles SET source_url = 'https://www.cdc.gov/autism/signs-symptoms/index.html', source_accessed_at = CURRENT_DATE
WHERE title = 'Otizm Spektrum Bozukluğu Nedir? İlk Belirtiler Nelerdir?'
  AND source_url = 'https://www.cdc.gov/autism/signs-symptoms/';

UPDATE knowledge_articles SET source_url = 'https://www.asha.org/practice/autism-and-communication-skills-misconceptions-versus-facts/', source_accessed_at = CURRENT_DATE
WHERE title = 'Otizmde Dil ve Konuşma Terapisi Süreci'
  AND source_url = 'https://www.asha.org/public/speech/development/autism/';

-- Başlık etkinlik tarifi vaat ediyordu, metin ise güvenlik ve kişiselleştirme anlatıyor.
UPDATE knowledge_articles SET title = 'Duyusal Gereksinimlerde Evde Güvenli Yaklaşım'
WHERE title = 'Evde Yapılabilecek Basit Duyu Bütünleme Aktiviteleri'
  AND usage_type = 'ORIGINAL';
