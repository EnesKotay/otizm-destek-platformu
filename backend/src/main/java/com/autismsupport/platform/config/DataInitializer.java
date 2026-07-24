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
                .content("<h3>Kısa cevap</h3><p>PECS, konuşma dışındaki iletişim yollarından biridir. Bazı bireyler için işlevsel iletişimi destekleyebilir; her çocuk için aynı sonucu vermesi beklenmez ve konuşmanın yerini almak zorunda değildir.</p>"
                        + "<p>Sistem altı temel aşamadan oluşmaktadır:</p>"
                        + "<ul>"
                        + "<li><strong>1. İletişimi Başlatma:</strong> Çocuk istediği nesnenin resmini alıcıya verir.</li>"
                        + "<li><strong>2. Mesafe ve Kalıcılık:</strong> İletişim kurmak için farklı odalardaki kişilere ulaşmayı öğrenir.</li>"
                        + "<li><strong>3. Resim Ayırt Etme:</strong> İki veya daha fazla resim arasından doğru olanı seçer.</li>"
                        + "<li><strong>4. Cümle Yapısı:</strong> \"Ben ... istiyorum\" şeklinde görsel cümle şeritleri oluşturur.</li>"
                        + "<li><strong>5. Sorulara Cevap Verme:</strong> \"Ne istiyorsun?\" sorusuna resimlerle yanıt verir.</li>"
                        + "<li><strong>6. Yorum Yapma:</strong> Çevresindeki olaylar hakkında sosyal paylaşımlarda bulunur.</li>"
                        + "</ul>"
                        + "<h3>Güvenli kullanım</h3><p>Hedefler bireyin iletişim tercihleri ve gereksinimleriyle birlikte belirlenmelidir. Uygulamaya başlamadan önce alternatif ve destekleyici iletişim konusunda yetkin bir dil ve konuşma terapistinden değerlendirme alın.</p>")
                .category("İletişim")
                .author(author)
                .published(true)
                .viewCount(120)
                .format("TEXT")
                .sourceName("Tohum Otizm Vakfı")
                .sourceUrl("https://tohumotizm.org.tr/bilgi-bankasi/pecs-nedir")
                .sourcePublication("Tohum Otizm Vakfı Bilgi Bankası")
                .sourceAccessedAt(LocalDate.now())
                .licenseType("RIGHTS_RESERVED")
                .usageType("SUMMARY")
                .evidenceLevel("EXPERT_REVIEW")
                .reviewedBy(author).reviewedAt(LocalDateTime.now())
                .build(),

            KnowledgeArticle.builder()
                .title("Otizm Spektrumunda Öfke Nöbetleri (Meltdown) ile Baş Etme")
                .content("<p>Meltdown (duyusal veya duygusal patlama), bir çocuğun duyusal olarak aşırı yüklenmesi sonucu yaşadığı ve kontrol edemediği yoğun bir tepki durumudur. Tantrumdan (öfke nöbeti) en büyük farkı, çocuğun bu esnada herhangi bir kazanç ya da ilgi beklentisinin olmamasıdır.</p>"
                        + "<p>Duyusal patlama anlarında ebeveyn ve uzmanların uygulayabileceği stratejiler şunlardır:</p>"
                        + "<ul>"
                        + "<li><strong>Sakin Kalın:</strong> Çocuğun sakinleşebilmesi için öncelikle sizin sakin bir ses tonu ve duruş sergilemeniz gerekir.</li>"
                        + "<li><strong>Çevreyi Güvenli Hale Getirin:</strong> Çocuğu aşırı ışık, ses ve kalabalıktan uzaklaştırarak sessiz bir odaya veya köşeye alın.</li>"
                        + "<li><strong>Soru Yağmuruna Tutmayın:</strong> Meltdown anında işlemleme kapasitesi çok düşüktür; konuşmak yerine sessizce yanında durun.</li>"
                        + "<li><strong>Güvenliği Koruyun:</strong> Tehlikeli nesneleri uzaklaştırın ve alan açın. Eğitim almadan fiziksel kısıtlama uygulamayın.</li>"
                        + "</ul><h3>Ne zaman yardım alınmalı?</h3><p>Yaralanma riski, nefes alma sorunu veya olağan dışı bilinç değişikliği varsa acil destek isteyin. Tekrarlayan durumlar için tetikleyicileri bir uzmanla değerlendirin.</p>")
                .category("Davranış")
                .author(author)
                .published(true)
                .viewCount(245)
                .format("TEXT")
                .sourceName("Autism Speaks")
                .sourceUrl("https://www.autismspeaks.org/meltdown-management")
                .sourcePublication("Autism Speaks")
                .sourceAccessedAt(LocalDate.now())
                .licenseType("RIGHTS_RESERVED")
                .usageType("SUMMARY")
                .evidenceLevel("EXPERT_REVIEW")
                .reviewedBy(author).reviewedAt(LocalDateTime.now())
                .build(),

            KnowledgeArticle.builder()
                .title("Uygulamalı Davranış Analizi (ABA) Nedir?")
                .content("<h3>Kısa cevap</h3><p>Uygulamalı Davranış Analizi (ABA), davranış ile çevre arasındaki ilişkiyi inceleyen ve beceri öğretiminde kullanılan yaklaşımlar bütünüdür. Araştırmalar bazı hedeflerde yarar bildirse de sonuçlar kişiden kişiye değişir; yaklaşımın yoğunluğu ve uygulanma biçimi ayrıca değerlendirilmelidir.</p>"
                        + "<p>Temel ABA teknikleri arasında şunlar yer alır:</p>"
                        + "<ul>"
                        + "<li><strong>Pekiştirme:</strong> İşlevsel ve anlamlı becerilerin öğrenilmesini desteklemek için olumlu pekiştireçler kullanılabilir.</li>"
                        + "<li><strong>Küçük Adımlarla Öğretim (DTT):</strong> Karmaşık beceriler küçük, kolay öğrenilebilir parçalara bölünerek öğretilir.</li>"
                        + "<li><strong>İpucu Sunma ve Silikleştirme:</strong> Çocuğa doğru yanıtı vermesi için fiziksel, sözel veya görsel ipuçları verilir ve zamanla azaltılır.</li>"
                        + "</ul><h3>Kalite ölçütleri</h3><p>Hedefler bireyin özerkliğine, iletişimine ve yaşam kalitesine hizmet etmeli; zararsız otistik özellikleri yalnızca daha “normal” görünmek amacıyla bastırmamalıdır. Aile ve birey hedef belirleme sürecine katılmalıdır.</p>")
                .category("Eğitim")
                .author(author)
                .published(true)
                .viewCount(310)
                .format("TEXT")
                .sourceName("Tohum Otizm Vakfı")
                .sourceUrl("https://tohumotizm.org.tr/bilgi-bankasi/aba-tedavisi")
                .sourcePublication("Tohum Otizm Vakfı Bilgi Bankası")
                .sourceAccessedAt(LocalDate.now())
                .licenseType("RIGHTS_RESERVED")
                .usageType("SUMMARY")
                .evidenceLevel("EXPERT_REVIEW")
                .reviewedBy(author).reviewedAt(LocalDateTime.now())
                .build(),

            KnowledgeArticle.builder()
                .title("Otizmli Çocuklarda Uyku Problemleri ve Çözüm Önerileri")
                .content("<h3>Kısa cevap</h3><p>Uykuya dalma, gece uyanma veya düzenli uyuma güçlükleri otistik çocuklarda görülebilir. Süre, sıklık ve gündüz işlevine etkisi değerlendirilmeden tek bir nedene bağlanmamalıdır.</p>"
                        + "<p>Uyku düzenini iyileştirmek için şu adımları takip edebilirsiniz:</p>"
                        + "<ul>"
                        + "<li><strong>Rutin Oluşturun:</strong> Her akşam aynı saatte ılık banyo, kitap okuma veya hafif müzik gibi sakinleştirici uyku öncesi rutinler uygulayın.</li>"
                        + "<li><strong>Duyusal Düzenleme:</strong> Odanın sıcaklığını, yatağın dokusunu ve kıyafetlerin etiketlerini çocuğunuzun hassasiyetlerine göre ayarlayın.</li>"
                        + "<li><strong>Gündüz Aktiviteleri:</strong> Çocuğun gün içinde fiziksel olarak aktif olmasını sağlayarak vücudunun akşam uykuya ihtiyaç duymasını kolaylaştırın.</li>"
                        + "</ul><h3>Ne zaman uzmana başvurmalı?</h3><p>Horlama, nefes durması, belirgin gündüz uykululuğu, ağrı şüphesi veya uzun süren uyku güçlüğünde çocuk hekimine başvurun. İlaç ve melatonin yalnızca hekim değerlendirmesiyle kullanılmalıdır.</p>")
                .category("Sağlık")
                .author(author)
                .published(true)
                .viewCount(185)
                .format("TEXT")
                .sourceName("NICE CG170")
                .sourceUrl("https://www.nice.org.uk/guidance/cg170")
                .sourcePublication("National Institute for Health and Care Excellence")
                .sourceAccessedAt(LocalDate.now())
                .licenseType("RIGHTS_RESERVED").usageType("SUMMARY").evidenceLevel("GUIDELINE")
                .reviewedBy(author).reviewedAt(LocalDateTime.now())
                .build(),

            KnowledgeArticle.builder()
                .title("Otizm ve Beslenme: Glütensiz ve Kazeinsiz Diyetler")
                .content("<h3>Kısa cevap</h3><p>Glütensiz veya kazeinsiz diyetlerin otizmin temel özelliklerini iyileştirdiğini göstermek için mevcut kanıtlar yeterli değildir. Çölyak hastalığı, alerji veya başka bir tıbbi gereksinim varsa beslenme planı ayrıca düzenlenebilir.</p>"
                        + "<p>Beslenme düzeninde değişiklik yaparken dikkat edilmesi gerekenler:</p>"
                        + "<ul>"
                        + "<li><strong>Uzman Kontrolü:</strong> Kısıtlayıcı diyetler kalsiyum, B vitaminleri ve lif eksikliklerine yol açabileceği için kesinlikle çocuk doktoru ve diyetisyen kontrolünde yürütülmelidir.</li>"
                        + "<li><strong>Yavaş Geçiş:</strong> Çocuğun beslenme alışkanlıklarını aniden değiştirmek yerine glütensiz ve kazeinsiz alternatifleri aşamalı olarak tanıtın.</li>"
                        + "<li><strong>Gıda Günlüğü:</strong> Diyet süresince çocuğun davranışlarında, sindirim sisteminde veya uyku kalitesinde meydana gelen değişiklikleri günlük olarak kaydedin.</li>"
                        + "</ul><h3>Önemli sınırlılık</h3><p>Kısıtlayıcı diyetleri bir “otizm tedavisi” olarak sunmayın. Büyüme, besin alımı ve sindirim yakınmaları çocuk hekimi ile diyetisyen tarafından izlenmelidir.</p>")
                .category("Beslenme")
                .author(author)
                .published(true)
                .viewCount(159)
                .format("TEXT")
                .sourceName("NICE CG170")
                .sourceUrl("https://www.nice.org.uk/guidance/cg170")
                .sourcePublication("National Institute for Health and Care Excellence")
                .sourceAccessedAt(LocalDate.now())
                .licenseType("RIGHTS_RESERVED").usageType("SUMMARY").evidenceLevel("GUIDELINE")
                .reviewedBy(author).reviewedAt(LocalDateTime.now())
                .build(),

            KnowledgeArticle.builder()
                .title("Evde Yapılabilecek Basit Duyu Bütünleme Aktiviteleri")
                .content("<h3>Kısa cevap</h3><p>Duyusal gereksinimler kişiye özeldir. Ev etkinlikleri çocuğun rahatlığına ve isteğine göre uyarlanmalı; rahatsızlık veren uyaranlara zorla maruz bırakma yapılmamalıdır.</p>"
                        + "<p>Evde uygulanabilecek bazı aktiviteler:</p>"
                        + "<ul>"
                        + "<li><strong>Dokunsal Oyunlar:</strong> Tıraş köpüğü, pirinç havuzu, oyun hamuru ve farklı kumaş parçalarıyla oynamak dokunma duyusunu geliştirir.</li>"
                        + "<li><strong>Hareket:</strong> Yaşa uygun, düşme riski düşük hareket oyunları seçin ve sürekli gözetim sağlayın.</li>"
                        + "<li><strong>Derin basınç:</strong> Yalnızca çocuk istiyorsa kısa süreli yastık itme veya eşya taşıma gibi sıkışma ve nefes kısıtlaması yaratmayan etkinlikleri deneyin.</li>"
                        + "</ul><p>Denge kaybı, ağrı, yoğun kaçınma veya günlük yaşamı etkileyen duyusal güçlüklerde ergoterapist değerlendirmesi alın.</p>")
                .category("Duyusal Gelişim")
                .author(author)
                .published(true)
                .viewCount(298)
                .format("TEXT")
                .sourceName("NICE CG170")
                .sourceUrl("https://www.nice.org.uk/guidance/cg170")
                .sourcePublication("National Institute for Health and Care Excellence")
                .sourceAccessedAt(LocalDate.now())
                .licenseType("RIGHTS_RESERVED").usageType("SUMMARY").evidenceLevel("GUIDELINE")
                .reviewedBy(author).reviewedAt(LocalDateTime.now())
                .build(),

            KnowledgeArticle.builder()
                .title("Otizm Spektrum Bozukluğu Nedir? İlk Belirtiler Nelerdir?")
                .content("<h3>Kısa cevap</h3><p>Otizm, sosyal iletişim, etkileşim, ilgi alanları, hareketler ve duyusal deneyimlerde farklılıklarla seyreden nörogelişimsel bir durumdur. Belirtiler ve destek gereksinimleri kişiden kişiye değişir.</p>"
                        + "<h3>Değerlendirmeyi düşündürebilecek işaretler</h3><p>İsme yanıt, jestler, ortak dikkat, oyun, dil gelişimi veya duyusal tepkilerde belirgin farklılıklar görülebilir. Tek bir belirti tanı koydurmaz.</p>"
                        + "<h3>Sonraki adım</h3><p>Gelişimle ilgili kaygınız varsa çocuk hekiminizle görüşün. Değerlendirme, çocuğu etiketlemekten çok güçlü yönleri ve destek gereksinimlerini anlamaya yardımcı olur.</p>")
                .category("Genel")
                .author(author)
                .published(true)
                .viewCount(412)
                .format("TEXT")
                .sourceName("CDC — Signs and Symptoms of Autism")
                .sourceUrl("https://www.cdc.gov/autism/signs-symptoms/")
                .sourcePublication("Centers for Disease Control and Prevention")
                .sourceAccessedAt(LocalDate.now())
                .licenseType("PUBLIC_DOMAIN").usageType("SUMMARY").evidenceLevel("GUIDELINE")
                .reviewedBy(author).reviewedAt(LocalDateTime.now())
                .build(),

            KnowledgeArticle.builder()
                .title("Otizmde Dil ve Konuşma Terapisi Süreci")
                .content("<h3>Kısa cevap</h3><p>Dil ve konuşma terapisi; konuşma, dili anlama, sosyal iletişim ve alternatif iletişim gibi alanlarda bireyselleştirilmiş destek sunabilir. Amaç yalnızca konuşma üretmek değil, kişinin güvenilir biçimde iletişim kurabilmesidir.</p>"
                        + "<p>Ebeveynlerin evde konuşmayı desteklemek için uygulayabileceği pratik yöntemler:</p>"
                        + "<ul>"
                        + "<li><strong>Paralel Konuşma:</strong> Çocuğun yaptığı eylemi anlık olarak basit cümlelerle betimleyin.</li>"
                        + "<li><strong>Bekleme Süresi Tanıma:</strong> Bir isteği hemen karşılamak yerine çocuğun iletişim kurması için birkaç saniye bekleyin.</li>"
                        + "<li><strong>Model Olma:</strong> Doğru telaffuz ve cümle yapısını, düzeltmeden önce doğru şekliyle tekrar ederek gösterin.</li>"
                        + "</ul><h3>İyi uygulama</h3><p>İletişim cihazı, işaret veya resim kullanımı konuşmaya engel olarak görülmemelidir. Hedefler çocuk ve aileyle birlikte belirlenmeli, ilerleme işlevsel iletişim üzerinden izlenmelidir.</p>")
                .category("İletişim")
                .author(author)
                .published(true)
                .viewCount(153)
                .format("TEXT")
                .sourceName("ASHA — Autism and Communication")
                .sourceUrl("https://www.asha.org/public/speech/development/autism/")
                .sourcePublication("American Speech-Language-Hearing Association")
                .sourceAccessedAt(LocalDate.now())
                .licenseType("RIGHTS_RESERVED").usageType("SUMMARY").evidenceLevel("EXPERT_REVIEW")
                .reviewedBy(author).reviewedAt(LocalDateTime.now())
                .build()
        );

        knowledgeArticleRepository.saveAll(articles);
        log.info("{} zengin Bilgi Bankası içeriği veritabanına başarıyla yüklendi.", articles.size());
    }

}
