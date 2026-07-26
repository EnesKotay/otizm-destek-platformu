-- Daha önce kurulmuş veritabanlarındaki başlangıç yazılarını da yeni editöryal
-- standarda taşır. Metinler kaynak ifadelerin kopyası değil, platformun kısa
-- ve güvenlik odaklı bağımsız anlatımıdır.

-- source_url bir içe aktarma kimliği değil, kaynak gösterim alanıdır. Birden
-- fazla platform yazısı aynı kılavuzu kaynak alabilir (aşağıdaki NICE CG170
-- yazıları gibi), bu nedenle V38/V40'ta oluşturulan benzersiz indeks uygun değildir.
-- URL ile arama ve içe aktarma kontrolleri için normal indeksi koruyoruz.
DROP INDEX IF EXISTS idx_knowledge_source_url;
CREATE INDEX idx_knowledge_source_url
    ON knowledge_articles(source_url)
    WHERE source_url IS NOT NULL;

UPDATE knowledge_articles SET
content = '<h3>Kısa cevap</h3><p>PECS, konuşma dışındaki iletişim yollarından biridir. Bazı bireyler için işlevsel iletişimi destekleyebilir; her çocuk için aynı sonucu vermesi beklenmez.</p><h3>Güvenli kullanım</h3><p>Hedefler bireyin iletişim tercihleriyle birlikte belirlenmelidir. Başlamadan önce alternatif ve destekleyici iletişim konusunda yetkin bir dil ve konuşma terapistinden değerlendirme alın.</p>',
source_name = 'Tohum Otizm Vakfı', source_url = 'https://tohumotizm.org.tr/bilgi-bankasi/pecs-nedir',
source_publication = 'Tohum Otizm Vakfı Bilgi Bankası', source_accessed_at = CURRENT_DATE,
license_type = 'RIGHTS_RESERVED', usage_type = 'SUMMARY', evidence_level = 'EXPERT_REVIEW',
reviewed_by_id = author_id, reviewed_at = CURRENT_TIMESTAMP, review_notes = 'Kaynak, telif beyanı ve ölçülü sağlık dili kontrol edildi.',
pending_review = FALSE, is_published = TRUE
WHERE title = 'Otizmde Alternatif ve Destekleyici İletişim Yöntemleri (PECS)';

UPDATE knowledge_articles SET
content = '<h3>Kısa cevap</h3><p>Meltdown, yoğun duyusal veya duygusal yüklenmeye verilen istemsiz bir tepki olabilir. Kişiyi cezalandırmak yerine uyaranları azaltın, sakin ve kısa iletişim kurun.</p><h3>Güvenlik</h3><p>Tehlikeli nesneleri uzaklaştırın ve alan açın. Eğitim almadan fiziksel kısıtlama uygulamayın. Yaralanma, nefes sorunu veya olağan dışı bilinç değişikliğinde acil destek isteyin.</p>',
source_name = 'Autism Speaks', source_url = 'https://www.autismspeaks.org/meltdown-management',
source_publication = 'Autism Speaks', source_accessed_at = CURRENT_DATE,
license_type = 'RIGHTS_RESERVED', usage_type = 'SUMMARY', evidence_level = 'EXPERT_REVIEW',
reviewed_by_id = author_id, reviewed_at = CURRENT_TIMESTAMP, review_notes = 'Kriz güvenliği ve fiziksel kısıtlama dili kontrol edildi.',
pending_review = FALSE, is_published = TRUE
WHERE title = 'Otizm Spektrumunda Öfke Nöbetleri (Meltdown) ile Baş Etme';

UPDATE knowledge_articles SET
content = '<h3>Kısa cevap</h3><p>ABA, davranış ile çevre arasındaki ilişkiyi inceleyen ve beceri öğretiminde kullanılan yaklaşımlar bütünüdür. Bazı hedeflerde yarar bildirilebilir; sonuçlar ve uygunluk kişiden kişiye değişir.</p><h3>Kalite ölçütleri</h3><p>Hedefler özerklik, iletişim ve yaşam kalitesine hizmet etmeli; zararsız otistik özellikleri yalnızca daha normal görünmek amacıyla bastırmamalıdır. Birey ve aile hedef belirlemeye katılmalıdır.</p>',
source_name = 'Tohum Otizm Vakfı', source_url = 'https://tohumotizm.org.tr/bilgi-bankasi/aba-tedavisi',
source_publication = 'Tohum Otizm Vakfı Bilgi Bankası', source_accessed_at = CURRENT_DATE,
license_type = 'RIGHTS_RESERVED', usage_type = 'SUMMARY', evidence_level = 'EXPERT_REVIEW',
reviewed_by_id = author_id, reviewed_at = CURRENT_TIMESTAMP, review_notes = 'Kesin üstünlük iddiası kaldırıldı; özerklik ve bireyselleştirme ölçütleri eklendi.',
pending_review = FALSE, is_published = TRUE
WHERE title = 'Uygulamalı Davranış Analizi (ABA) Nedir?';

UPDATE knowledge_articles SET
content = '<h3>Kısa cevap</h3><p>Uykuya dalma ve gece uyanma güçlükleri otistik çocuklarda görülebilir. Düzenli saatler, sakin bir rutin ve duyusal gereksinimlere uygun ortam yardımcı olabilir.</p><h3>Ne zaman uzmana başvurmalı?</h3><p>Horlama, nefes durması, ağrı şüphesi, belirgin gündüz uykululuğu veya uzun süren güçlükte çocuk hekimine başvurun. İlaç ve melatonin yalnızca hekim değerlendirmesiyle kullanılmalıdır.</p>',
source_name = 'NICE CG170', source_url = 'https://www.nice.org.uk/guidance/cg170',
source_publication = 'National Institute for Health and Care Excellence', source_accessed_at = CURRENT_DATE,
license_type = 'RIGHTS_RESERVED', usage_type = 'SUMMARY', evidence_level = 'GUIDELINE',
reviewed_by_id = author_id, reviewed_at = CURRENT_TIMESTAMP, review_notes = 'Uyku güvenliği ve uzman başvuru ölçütleri eklendi.',
pending_review = FALSE, is_published = TRUE
WHERE title = 'Otizmli Çocuklarda Uyku Problemleri ve Çözüm Önerileri';

UPDATE knowledge_articles SET
content = '<h3>Kısa cevap</h3><p>Glütensiz veya kazeinsiz diyetlerin otizmin temel özelliklerini iyileştirdiğini göstermek için mevcut kanıtlar yeterli değildir. Çölyak, alerji veya başka bir tıbbi gereksinim ayrıca değerlendirilir.</p><h3>Güvenlik</h3><p>Kısıtlayıcı diyetleri otizm tedavisi olarak sunmayın. Büyüme ve besin alımı çocuk hekimi ile diyetisyen tarafından izlenmelidir.</p>',
source_name = 'NICE CG170', source_url = 'https://www.nice.org.uk/guidance/cg170',
source_publication = 'National Institute for Health and Care Excellence', source_accessed_at = CURRENT_DATE,
license_type = 'RIGHTS_RESERVED', usage_type = 'SUMMARY', evidence_level = 'GUIDELINE',
reviewed_by_id = author_id, reviewed_at = CURRENT_TIMESTAMP, review_notes = 'Kanıt sınırlılığı ve beslenme güvenliği açıklandı.',
pending_review = FALSE, is_published = TRUE
WHERE title = 'Otizm ve Beslenme: Glütensiz ve Kazeinsiz Diyetler';

UPDATE knowledge_articles SET
content = '<h3>Kısa cevap</h3><p>Duyusal gereksinimler kişiye özeldir. Etkinlikler çocuğun rahatlığına ve isteğine göre uyarlanmalı; rahatsızlık veren uyaranlara zorla maruz bırakma yapılmamalıdır.</p><h3>Güvenlik</h3><p>Düşme, sıkışma ve nefes kısıtlaması riski yaratmayın. Yoğun kaçınma, ağrı veya günlük yaşamı etkileyen güçlüklerde ergoterapist değerlendirmesi alın.</p>',
source_name = 'NICE CG170', source_url = 'https://www.nice.org.uk/guidance/cg170',
source_publication = 'National Institute for Health and Care Excellence', source_accessed_at = CURRENT_DATE,
license_type = 'RIGHTS_RESERVED', usage_type = 'SUMMARY', evidence_level = 'GUIDELINE',
reviewed_by_id = author_id, reviewed_at = CURRENT_TIMESTAMP, review_notes = 'Ev ekipmanı, sıkışma ve zorla maruz bırakma riskleri kaldırıldı.',
pending_review = FALSE, is_published = TRUE
WHERE title = 'Evde Yapılabilecek Basit Duyu Bütünleme Aktiviteleri';

UPDATE knowledge_articles SET
content = '<h3>Kısa cevap</h3><p>Otizm; sosyal iletişim, etkileşim, ilgi alanları, hareketler ve duyusal deneyimlerde farklılıklarla seyreden nörogelişimsel bir durumdur. Belirtiler ve destek gereksinimleri kişiden kişiye değişir.</p><h3>Sonraki adım</h3><p>İsme yanıt, jestler, ortak dikkat, oyun veya dil gelişimi hakkında kaygınız varsa çocuk hekiminizle görüşün. Tek bir belirti tanı koydurmaz.</p>',
source_name = 'CDC — Signs and Symptoms of Autism', source_url = 'https://www.cdc.gov/autism/signs-symptoms/',
source_publication = 'Centers for Disease Control and Prevention', source_accessed_at = CURRENT_DATE,
license_type = 'PUBLIC_DOMAIN', usage_type = 'SUMMARY', evidence_level = 'GUIDELINE',
reviewed_by_id = author_id, reviewed_at = CURRENT_TIMESTAMP, review_notes = 'Tanı koydurucu olmayan, nöroçeşitlilik odaklı dil kullanıldı.',
pending_review = FALSE, is_published = TRUE
WHERE title = 'Otizm Spektrum Bozukluğu Nedir? İlk Belirtiler Nelerdir?';

UPDATE knowledge_articles SET
content = '<h3>Kısa cevap</h3><p>Dil ve konuşma terapisi; konuşma, dili anlama, sosyal iletişim ve alternatif iletişim alanlarında bireyselleştirilmiş destek sunabilir. Amaç kişinin güvenilir biçimde iletişim kurabilmesidir.</p><h3>İyi uygulama</h3><p>İletişim cihazı, işaret veya resim kullanımı konuşmaya engel sayılmamalıdır. Hedefler çocuk ve aileyle birlikte belirlenmelidir.</p>',
source_name = 'ASHA — Autism and Communication', source_url = 'https://www.asha.org/public/speech/development/autism/',
source_publication = 'American Speech-Language-Hearing Association', source_accessed_at = CURRENT_DATE,
license_type = 'RIGHTS_RESERVED', usage_type = 'SUMMARY', evidence_level = 'EXPERT_REVIEW',
reviewed_by_id = author_id, reviewed_at = CURRENT_TIMESTAMP, review_notes = 'İşlevsel ve alternatif iletişim yaklaşımı kontrol edildi.',
pending_review = FALSE, is_published = TRUE
WHERE title = 'Otizmde Dil ve Konuşma Terapisi Süreci';
