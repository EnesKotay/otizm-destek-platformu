package com.autismsupport.platform.config;

import com.autismsupport.platform.model.Tag;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.model.KnowledgeArticle;
import com.autismsupport.platform.model.UserRole;
import com.autismsupport.platform.repository.KnowledgeArticleRepository;
import com.autismsupport.platform.repository.TagRepository;
import com.autismsupport.platform.repository.UserRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.interceptor.TransactionAspectSupport;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final TagRepository tagRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EntityManager entityManager;
    private final KnowledgeArticleRepository knowledgeArticleRepository;

    @Value("${app.bootstrap.admin-email:}")
    private String bootstrapAdminEmail;

    @Value("${app.bootstrap.admin-password:}")
    private String bootstrapAdminPassword;

    @Override
    @Transactional
    public void run(String... args) {
        try {
            initAdminUser();
            initTags();
            initParentCoordinates();
            initKnowledgeArticles();
            // Hibernate insert'leri commit'e erteler; commit'te patlayan bir hata
            // (ör. eksik sütun) bu catch'in dışında kalır. Flush ile şimdi tetikle.
            entityManager.flush();
        } catch (Exception e) {
            // Seed data isteğe bağlıdır; burada oluşan bir hata (ör. şemayla eşleşmeyen
            // bir sütun) tüm uygulamanın açılışını engellememeli / çökme döngüsüne
            // sokmamalı. Hatayı logla, işlemi rollback-only işaretle ve normal başlat.
            log.error("Başlangıç verisi (seed data) yüklenirken hata oluştu; " +
                    "uygulama yine de başlatılıyor: {}", e.getMessage(), e);
            TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
        }
    }

    private void initParentCoordinates() {
        log.info("Platform ebeveynlerine gerçekçi konumlar tanımlanıyor...");

        // Ayşe Yılmaz -> İstanbul Kadıköy (~0.5km)
        updateParentCoords("ayse.yilmaz@email.com", 40.9912, 29.0255, "İstanbul");

        // Mehmet Demir -> İstanbul Beşiktaş (~6km)
        updateParentCoords("mehmet.demir@email.com", 41.0428, 29.0075, "İstanbul");

        // Zeynep Kaya -> Sivas Merkez (~2.5km)
        updateParentCoords("zeynep.kaya@email.com", 39.7505, 37.0156, "Sivas");

        // Ali Can -> Sivas Merkez (~1.5km)
        updateParentCoords("ali.can@email.com", 39.7312, 37.0423, "Sivas");

        // Fatma Şahin -> Ankara Çankaya
        updateParentCoords("fatma.sahin@email.com", 39.9208, 32.8541, "Ankara");
    }

    private void updateParentCoords(String email, double lat, double lon, String city) {
        userRepository.findByEmail(email).ifPresent(user -> {
            if (user.getLatitude() == null || user.getLongitude() == null) {
                user.setLatitude(lat);
                user.setLongitude(lon);
                user.setCity(city);
                userRepository.save(user);
                log.info("Veli koordinatları veritabanına işlendi; userId={}", user.getId());
            }
        });
    }

    private void initAdminUser() {
        if (bootstrapAdminEmail == null || bootstrapAdminEmail.isBlank()
                || bootstrapAdminPassword == null || bootstrapAdminPassword.isBlank()) {
            log.info("Bootstrap admin oluşturma atlandı: admin e-posta/şifre env ile verilmedi.");
            return;
        }

        if (userRepository.findByEmail(bootstrapAdminEmail).isPresent()) {
            log.info("Bootstrap admin zaten mevcut: {}", bootstrapAdminEmail);
            return;
        }

        User admin = User.builder()
                .fullName("Platform Yöneticisi")
                .email(bootstrapAdminEmail.trim().toLowerCase())
                .passwordHash(passwordEncoder.encode(bootstrapAdminPassword))
                .role(UserRole.ADMIN)
                .verified(true)
                .emailVerified(true)
                .kvkkConsent(true)
                .build();

        userRepository.save(admin);
        log.info("Bootstrap admin kullanıcısı oluşturuldu: {}", bootstrapAdminEmail);
    }

    private void initTags() {
        if (tagRepository.count() > 0) return;

        log.info("Semptom etiketleri ekleniyor...");

        List<Tag> tags = List.of(
            // İLETİŞİM
            tag("Konuşma Gecikmesi",       "ILETISIM", "Yaşına göre beklenen konuşma seviyesinin gerisinde kalma"),
            tag("Sözel Olmayan İletişim",   "ILETISIM", "Jest, mimik ve beden dili ile iletişim"),
            tag("Ekolali",                  "ILETISIM", "Duyulan sözcük veya cümlelerin tekrarı"),
            tag("Dil Gerilemesi",           "ILETISIM", "Önceden kazanılan dil becerilerinin kaybı"),
            tag("Zamirleri Ters Kullanma",  "ILETISIM", "'Ben' yerine 'Sen' veya üçüncü tekil şahıs kullanma"),
            tag("Sözel Komutları Anlama Zorluğu", "ILETISIM", "İşitme sorunu olmamasına rağmen komutlara tepki vermeme"),
            tag("Düz Ses Tonu",             "ILETISIM", "Monoton, prosodi eksikliği veya robotik ses tonuyla konuşma"),
            tag("Karşılıklı Sohbet Zorluğu","ILETISIM", "Kendi ilgi alanları dışında sohbeti başlatma ve sürdürmede güçlük"),
            tag("Mecazları Anlama Zorluğu", "ILETISIM", "Deyimleri, şakaları ve mecaz anlamları kelimesi kelimesine algılama"),
            
            // SOSYAL
            tag("Göz Teması Zorluğu",       "SOSYAL",   "Göz teması kurmada veya sürdürmede zorluk"),
            tag("Sosyal İzolasyon",         "SOSYAL",   "Akranlarla etkileşimden kaçınma"),
            tag("Oyun Becerileri",          "SOSYAL",   "Hayal gücü oyunu veya paylaşımlı oyun zorluğu"),
            tag("Taklit Zorluğu",           "SOSYAL",   "Hareketleri veya sesleri taklit etmede zorluk"),
            tag("Ortak Dikkat Eksikliği",   "SOSYAL",   "Bir nesneye/olaya ilgi çekmek için parmakla işaret etmeme"),
            tag("Empati Kurma Zorluğu",     "SOSYAL",   "Başkalarının duygusal ipuçlarını anlama ve uygun tepki vermede güçlük"),
            tag("Akran İlişkilerinde Güçlük", "SOSYAL", "Yaşıtlarıyla arkadaş edinme, sürdürme ve oyun kurmada zorluk"),
            tag("Beden Dili Okuma Zorluğu", "SOSYAL",   "Başkalarının jest, mimik ve duruşlarını yanlış anlama"),
            tag("İsimle Seslenildiğinde Tepkisizlik", "SOSYAL", "Kendi ismine tutarlı bir şekilde yanıt vermeme"),

            // DUYUSAL
            tag("Duyusal Hassasiyet",       "DUYUSAL",  "Duyusal uyaranlara aşırı tepki"),
            tag("Ses Hassasiyeti",          "DUYUSAL",  "Yüksek seslere veya belirli seslere aşırı tepki"),
            tag("Doku Hassasiyeti",         "DUYUSAL",  "Belirli dokulara veya giysilere karşı hassasiyet"),
            tag("Işık Hassasiyeti",         "DUYUSAL",  "Parlak ışıklara karşı hassasiyet"),
            tag("Yeme Seçiciliği",          "DUYUSAL",  "Sınırlı yiyecek çeşidi ve yeme sorunları"),
            tag("Koku ve Tat Hassasiyeti",  "DUYUSAL",  "Belirli kokulara karşı aşırı tepki ve yiyecek dokularına seçicilik"),
            tag("Ağrı Hassasiyeti",         "DUYUSAL",  "Acıya karşı aşırı tepki verme veya hiç tepki vermeme"),
            tag("Proprioseptif Arayış",     "DUYUSAL",  "Sıkıştırılma, ağır battaniye veya sertçe sarılma ihtiyacı"),
            tag("Vestibüler İhtiyaç",       "DUYUSAL",  "Sürekli kendi etrafında dönme, sallanma veya zıplama ihtiyacı"),
            tag("Görsel Uyaran Arayışı",    "DUYUSAL",  "Dönen nesnelere, tekerleklere veya ışıklara uzun süre odaklanma"),

            // DAVRANIŞ
            tag("Tekrarlayıcı Davranışlar", "DAVRANIS", "Stereotipik veya tekrarlayan hareketler"),
            tag("Stereotipi",               "DAVRANIS", "El çırpma, sallanma gibi tekrarlayan motor hareketler"),
            tag("Rutin Bağımlılığı",        "DAVRANIS", "Değişikliklere karşı direnme, rutinlere bağlı kalma"),
            tag("Özkontrol Zorluğu",        "DAVRANIS", "Duygu ve davranış düzenleme güçlüğü"),
            tag("Uyku Problemleri",         "DAVRANIS", "Uykuya dalma veya uyku sürekliliğinde zorluk"),
            tag("Takıntı ve Özel İlgiler",  "DAVRANIS", "Belirli konulara, nesnelere veya detaylara aşırı düzeyde odaklanma"),
            tag("Kendi Kendine Zarar Verme","DAVRANIS", "Öfke, kriz veya duyusal yüklenme anında kendine vurma, ısırma"),
            tag("Meltdown / Duyusal Kriz",  "DAVRANIS", "Aşırı duyusal veya duygusal yüklenme sonucu yaşanan patlama nöbetleri"),
            tag("Tehlike Algısı Eksikliği", "DAVRANIS", "Korku hissetmeme, yola atlama veya tehlikeli durumlara girme eğilimi"),
            tag("Hiperaktivite",            "DAVRANIS", "Aşırı hareketlilik, yerinde duramama ve odaklanma güçlüğü"),

            // MOTOR
            tag("İnce Motor Zorluğu",       "MOTOR",    "Kalem tutma, düğme gibi ince motor becerilerde zorluk"),
            tag("Kaba Motor Zorluğu",       "MOTOR",    "Koşma, zıplama gibi büyük kas hareketlerinde zorluk"),
            tag("Koordinasyon",             "MOTOR",    "El-göz koordinasyonu ve denge problemleri"),
            tag("Motor Planlama Zorluğu",   "MOTOR",    "Yeni motor hareketleri tasarlama ve ardışık yapmada güçlük"),
            tag("Parmak Ucunda Yürüme",     "MOTOR",    "Topukları yere tam basmadan uzun süreli yürüme eğilimi"),
            tag("Zayıf Kas Tonusu",         "MOTOR",    "Gevşek vücut duruşu ve çabuk yorulma"),
            tag("El-Göz Koordinasyonu Zayıflığı", "MOTOR", "Top yakalama, fırlatma ve makas kullanma gibi becerilerde zorluk"),

            // EĞİTİM VE TERAPİ
            tag("Özel Eğitim",              "EGITIM",   "Bireyselleştirilmiş eğitim programı"),
            tag("ABA Terapi",               "EGITIM",   "Uygulamalı Davranış Analizi terapisi"),
            tag("Erişkin Yaşam Becerileri", "EGITIM",   "Günlük yaşam ve öz bakım becerileri eğitimi"),
            tag("Floortime Terapisi",       "EGITIM",   "Çocuğun liderliğini takip eden oyun ve etkileşim temelli terapi"),
            tag("Duyu Bütünleme Terapisi",  "EGITIM",   "Duyusal işlemleme zorluklarına yönelik ergoterapi temelli destek"),
            tag("Konuşma ve Dil Terapisi",  "EGITIM",   "İletişim, artikülasyon ve ifade edici dil becerileri desteği"),
            tag("Ergoterapi",               "EGITIM",   "Günlük yaşam becerileri, bağımsızlık ve ince motor gelişimi"),
            tag("PECS",                     "EGITIM",   "Resim Değiş Tokuşuna Dayalı İletişim Sistemi")
        );

        tagRepository.saveAll(tags);
        log.info("{} semptom etiketi eklendi.", tags.size());
    }

    private Tag tag(String name, String category, String description) {
        Tag t = new Tag();
        t.setName(name);
        t.setCategory(category);
        t.setDescription(description);
        return t;
    }

    private void initKnowledgeArticles() {
        if (knowledgeArticleRepository.count() > 0) {
            log.info("Bilgi Bankası makaleleri zaten mevcut, seed adımı atlanıyor.");
            return;
        }

        log.info("Platform Bilgi Bankası için başlangıç makaleleri ekleniyor...");

        // Önce yazar olarak atayabileceğimiz bir uzman veya yönetici bulalım
        User author = userRepository.findByEmail("psikolog.elza@autism.com")
                .orElseGet(() -> userRepository.findByEmail("dr.kemal@autism.com")
                .orElseGet(() -> userRepository.findByEmail(bootstrapAdminEmail != null ? bootstrapAdminEmail.trim().toLowerCase() : "admin@autism.com")
                .orElseGet(() -> {
                    List<User> allUsers = userRepository.findAll();
                    return allUsers.isEmpty() ? null : allUsers.get(0);
                })));

        if (author == null) {
            log.warn("Bilgi Bankası makaleleri eklenemedi: Yazar olarak atanacak hiçbir kullanıcı bulunamadı.");
            return;
        }

        List<KnowledgeArticle> articles = List.of(
            KnowledgeArticle.builder()
                .title("Otizmde Alternatif ve Destekleyici İletişim Yöntemleri (PECS)")
                .content("<h3>Kısa cevap</h3><p>PECS, konuşma dışındaki iletişim yollarından biridir. Bazı bireyler için işlevsel iletişimi destekleyebilir; her çocuk için aynı sonucu vermesi beklenmez.</p><h3>Güvenli kullanım</h3><p>Hedefler bireyin iletişim tercihleriyle birlikte belirlenmelidir. Başlamadan önce alternatif ve destekleyici iletişim konusunda yetkin bir dil ve konuşma terapistinden değerlendirme alın.</p>")
                .category("İletişim")
                .author(author)
                .published(true)
                .viewCount(120)
                .format("TEXT")
                .sourceName("Tohum Otizm Vakfı")
                .sourceUrl("https://tohumotizm.org.tr/otizm-nedir/egitim-terapi-ve-tedavi-uygulamalari/")
                .sourcePublication("Tohum Otizm Vakfı Bilgi Bankası")
                .sourceAccessedAt(LocalDate.now())
                .licenseType("ORIGINAL")
                .usageType("ORIGINAL")
                .evidenceLevel("EXPERT_REVIEW")
                .reviewedBy(author).reviewedAt(LocalDateTime.now())
                .build(),

            KnowledgeArticle.builder()
                .title("Otizm Spektrumunda Öfke Nöbetleri (Meltdown) ile Baş Etme")
                .content("<h3>Kısa cevap</h3><p>Meltdown, yoğun duyusal veya duygusal yüklenmeye verilen istemsiz bir tepki olabilir. Kişiyi cezalandırmak yerine uyaranları azaltın, sakin ve kısa iletişim kurun.</p><h3>Güvenlik</h3><p>Tehlikeli nesneleri uzaklaştırın ve alan açın. Eğitim almadan fiziksel kısıtlama uygulamayın. Yaralanma, nefes sorunu veya olağan dışı bilinç değişikliğinde acil destek isteyin.</p>")
                .category("Davranış")
                .author(author)
                .published(true)
                .viewCount(245)
                .format("TEXT")
                .sourceName("Autism Speaks")
                .sourceUrl("https://www.autismspeaks.org/tool-kit-excerpt/planning-crisis")
                .sourcePublication("Autism Speaks")
                .sourceAccessedAt(LocalDate.now())
                .licenseType("ORIGINAL")
                .usageType("ORIGINAL")
                .evidenceLevel("EXPERT_REVIEW")
                .reviewedBy(author).reviewedAt(LocalDateTime.now())
                .build(),

            KnowledgeArticle.builder()
                .title("Uygulamalı Davranış Analizi (ABA) Nedir?")
                .content("<h3>Kısa cevap</h3><p>ABA, davranış ile çevre arasındaki ilişkiyi inceleyen ve beceri öğretiminde kullanılan yaklaşımlar bütünüdür. Bazı hedeflerde yarar bildirilebilir; sonuçlar ve uygunluk kişiden kişiye değişir.</p><h3>Kalite ölçütleri</h3><p>Hedefler özerklik, iletişim ve yaşam kalitesine hizmet etmeli; zararsız otistik özellikleri yalnızca daha normal görünmek amacıyla bastırmamalıdır. Birey ve aile hedef belirlemeye katılmalıdır.</p>")
                .category("Eğitim")
                .author(author)
                .published(true)
                .viewCount(310)
                .format("TEXT")
                .sourceName("Tohum Otizm Vakfı")
                .sourceUrl("https://tohumotizm.org.tr/otizm-nedir/egitim-terapi-ve-tedavi-uygulamalari/")
                .sourcePublication("Tohum Otizm Vakfı Bilgi Bankası")
                .sourceAccessedAt(LocalDate.now())
                .licenseType("ORIGINAL")
                .usageType("ORIGINAL")
                .evidenceLevel("EXPERT_REVIEW")
                .reviewedBy(author).reviewedAt(LocalDateTime.now())
                .build(),

            KnowledgeArticle.builder()
                .title("Otizmli Çocuklarda Uyku Problemleri ve Çözüm Önerileri")
                .content("<h3>Kısa cevap</h3><p>Uykuya dalma ve gece uyanma güçlükleri otistik çocuklarda görülebilir. Düzenli saatler, sakin bir rutin ve duyusal gereksinimlere uygun ortam yardımcı olabilir.</p><h3>Ne zaman uzmana başvurmalı?</h3><p>Horlama, nefes durması, ağrı şüphesi, belirgin gündüz uykululuğu veya uzun süren güçlükte çocuk hekimine başvurun. İlaç ve melatonin yalnızca hekim değerlendirmesiyle kullanılmalıdır.</p>")
                .category("Sağlık")
                .author(author)
                .published(true)
                .viewCount(185)
                .format("TEXT")
                .sourceName("NICE CG170")
                .sourceUrl("https://www.nice.org.uk/guidance/cg170")
                .sourcePublication("National Institute for Health and Care Excellence")
                .sourceAccessedAt(LocalDate.now())
                .licenseType("ORIGINAL").usageType("ORIGINAL").evidenceLevel("GUIDELINE")
                .reviewedBy(author).reviewedAt(LocalDateTime.now())
                .build(),

            KnowledgeArticle.builder()
                .title("Otizm ve Beslenme: Glütensiz ve Kazeinsiz Diyetler")
                .content("<h3>Kısa cevap</h3><p>Glütensiz veya kazeinsiz diyetlerin otizmin temel özelliklerini iyileştirdiğini göstermek için mevcut kanıtlar yeterli değildir. Çölyak, alerji veya başka bir tıbbi gereksinim ayrıca değerlendirilir.</p><h3>Güvenlik</h3><p>Kısıtlayıcı diyetleri otizm tedavisi olarak sunmayın. Büyüme ve besin alımı çocuk hekimi ile diyetisyen tarafından izlenmelidir.</p>")
                .category("Beslenme")
                .author(author)
                .published(true)
                .viewCount(159)
                .format("TEXT")
                .sourceName("NICE CG170")
                .sourceUrl("https://www.nice.org.uk/guidance/cg170")
                .sourcePublication("National Institute for Health and Care Excellence")
                .sourceAccessedAt(LocalDate.now())
                .licenseType("ORIGINAL").usageType("ORIGINAL").evidenceLevel("GUIDELINE")
                .reviewedBy(author).reviewedAt(LocalDateTime.now())
                .build(),

            KnowledgeArticle.builder()
                .title("Duyusal Gereksinimlerde Evde Güvenli Yaklaşım")
                .content("<h3>Kısa cevap</h3><p>Duyusal gereksinimler kişiye özeldir. Etkinlikler çocuğun rahatlığına ve isteğine göre uyarlanmalı; rahatsızlık veren uyaranlara zorla maruz bırakma yapılmamalıdır.</p><h3>Güvenlik</h3><p>Düşme, sıkışma ve nefes kısıtlaması riski yaratmayın. Yoğun kaçınma, ağrı veya günlük yaşamı etkileyen güçlüklerde ergoterapist değerlendirmesi alın.</p>")
                .category("Duyusal Gelişim")
                .author(author)
                .published(true)
                .viewCount(298)
                .format("TEXT")
                .sourceName("NICE CG170")
                .sourceUrl("https://www.nice.org.uk/guidance/cg170")
                .sourcePublication("National Institute for Health and Care Excellence")
                .sourceAccessedAt(LocalDate.now())
                .licenseType("ORIGINAL").usageType("ORIGINAL").evidenceLevel("GUIDELINE")
                .reviewedBy(author).reviewedAt(LocalDateTime.now())
                .build(),

            KnowledgeArticle.builder()
                .title("Otizm Spektrum Bozukluğu Nedir? İlk Belirtiler Nelerdir?")
                .content("<h3>Kısa cevap</h3><p>Otizm; sosyal iletişim, etkileşim, ilgi alanları, hareketler ve duyusal deneyimlerde farklılıklarla seyreden nörogelişimsel bir durumdur. Belirtiler ve destek gereksinimleri kişiden kişiye değişir.</p><h3>Sonraki adım</h3><p>İsme yanıt, jestler, ortak dikkat, oyun veya dil gelişimi hakkında kaygınız varsa çocuk hekiminizle görüşün. Tek bir belirti tanı koydurmaz.</p>")
                .category("Genel")
                .author(author)
                .published(true)
                .viewCount(412)
                .format("TEXT")
                .sourceName("CDC — Signs and Symptoms of Autism")
                .sourceUrl("https://www.cdc.gov/autism/signs-symptoms/index.html")
                .sourcePublication("Centers for Disease Control and Prevention")
                .sourceAccessedAt(LocalDate.now())
                .licenseType("ORIGINAL").usageType("ORIGINAL").evidenceLevel("GUIDELINE")
                .reviewedBy(author).reviewedAt(LocalDateTime.now())
                .build(),

            KnowledgeArticle.builder()
                .title("Otizmde Dil ve Konuşma Terapisi Süreci")
                .content("<h3>Kısa cevap</h3><p>Dil ve konuşma terapisi; konuşma, dili anlama, sosyal iletişim ve alternatif iletişim alanlarında bireyselleştirilmiş destek sunabilir. Amaç kişinin güvenilir biçimde iletişim kurabilmesidir.</p><h3>İyi uygulama</h3><p>İletişim cihazı, işaret veya resim kullanımı konuşmaya engel sayılmamalıdır. Hedefler çocuk ve aileyle birlikte belirlenmelidir.</p>")
                .category("İletişim")
                .author(author)
                .published(true)
                .viewCount(153)
                .format("TEXT")
                .sourceName("ASHA — Autism and Communication")
                .sourceUrl("https://www.asha.org/practice/autism-and-communication-skills-misconceptions-versus-facts/")
                .sourcePublication("American Speech-Language-Hearing Association")
                .sourceAccessedAt(LocalDate.now())
                .licenseType("ORIGINAL").usageType("ORIGINAL").evidenceLevel("EXPERT_REVIEW")
                .reviewedBy(author).reviewedAt(LocalDateTime.now())
                .build()
        );

        knowledgeArticleRepository.saveAll(articles);
        log.info("{} zengin Bilgi Bankası içeriği veritabanına başarıyla yüklendi.", articles.size());
    }

}
