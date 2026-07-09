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
                log.info("Veli koordinatları veritabanına işlendi: {} ({}) -> {}", user.getFullName(), email, city);
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
                .content("<p>PECS (Resim Değiş-Tokuşuna Dayalı İletişim Sistemi), otizmli bireylere konuşmayı ve iletişimi öğretmek amacıyla geliştirilmiş, etkililiği kanıtlanmış bir yöntemdir. PECS, konuşamayan veya sınırlı konuşma becerisine sahip çocukların çevreleriyle etkili bir şekilde iletişim kurmasını hedefler.</p>"
                        + "<p>Sistem altı temel aşamadan oluşmaktadır:</p>"
                        + "<ul>"
                        + "<li><strong>1. İletişimi Başlatma:</strong> Çocuk istediği nesnenin resmini alıcıya verir.</li>"
                        + "<li><strong>2. Mesafe ve Kalıcılık:</strong> İletişim kurmak için farklı odalardaki kişilere ulaşmayı öğrenir.</li>"
                        + "<li><strong>3. Resim Ayırt Etme:</strong> İki veya daha fazla resim arasından doğru olanı seçer.</li>"
                        + "<li><strong>4. Cümle Yapısı:</strong> \"Ben ... istiyorum\" şeklinde görsel cümle şeritleri oluşturur.</li>"
                        + "<li><strong>5. Sorulara Cevap Verme:</strong> \"Ne istiyorsun?\" sorusuna resimlerle yanıt verir.</li>"
                        + "<li><strong>6. Yorum Yapma:</strong> Çevresindeki olaylar hakkında sosyal paylaşımlarda bulunur.</li>"
                        + "</ul>"
                        + "<p>PECS uygulaması sırasında çocuğun gösterdiği çabalar ödüllendirilmeli ve sabırlı bir yaklaşım sergilenmelidir.</p>")
                .category("İletişim")
                .author(author)
                .published(true)
                .viewCount(120)
                .format("TEXT")
                .sourceName("Tohum Otizm Vakfı")
                .sourceUrl("https://tohumotizm.org.tr/bilgi-bankasi/pecs-nedir")
                .build(),

            KnowledgeArticle.builder()
                .title("Otizm Spektrumunda Öfke Nöbetleri (Meltdown) ile Baş Etme")
                .content("<p>Meltdown (duyusal veya duygusal patlama), bir çocuğun duyusal olarak aşırı yüklenmesi sonucu yaşadığı ve kontrol edemediği yoğun bir tepki durumudur. Tantrumdan (öfke nöbeti) en büyük farkı, çocuğun bu esnada herhangi bir kazanç ya da ilgi beklentisinin olmamasıdır.</p>"
                        + "<p>Duyusal patlama anlarında ebeveyn ve uzmanların uygulayabileceği stratejiler şunlardır:</p>"
                        + "<ul>"
                        + "<li><strong>Sakin Kalın:</strong> Çocuğun sakinleşebilmesi için öncelikle sizin sakin bir ses tonu ve duruş sergilemeniz gerekir.</li>"
                        + "<li><strong>Çevreyi Güvenli Hale Getirin:</strong> Çocuğu aşırı ışık, ses ve kalabalıktan uzaklaştırarak sessiz bir odaya veya köşeye alın.</li>"
                        + "<li><strong>Soru Yağmuruna Tutmayın:</strong> Meltdown anında işlemleme kapasitesi çok düşüktür; konuşmak yerine sessizce yanında durun.</li>"
                        + "<li><strong>Güvenlik Önlemleri Alın:</strong> Çocuğun kendine veya çevresine zarar vermesini önlemek amacıyla gerekirse yumuşak engellemeler uygulayın.</li>"
                        + "</ul>")
                .category("Davranış")
                .author(author)
                .published(true)
                .viewCount(245)
                .format("TEXT")
                .sourceName("Autism Speaks")
                .sourceUrl("https://www.autismspeaks.org/meltdown-management")
                .build(),

            KnowledgeArticle.builder()
                .title("Uygulamalı Davranış Analizi (ABA) Nedir?")
                .content("<p>Uygulamalı Davranış Analizi (ABA - Applied Behavior Analysis), otizmli çocukların eğitiminde dünya genelinde en çok tercih edilen ve bilimsel etkililiği en yüksek olan yöntemdir. ABA, davranışların çevresel faktörlerle ilişkisini inceleyerek, sosyal açıdan önemli davranışları geliştirmeyi hedefler.</p>"
                        + "<p>Temel ABA teknikleri arasında şunlar yer alır:</p>"
                        + "<ul>"
                        + "<li><strong>Pekiştirme:</strong> İten davranışların kalıcı hale gelmesi için olumlu pekiştireçler kullanılır.</li>"
                        + "<li><strong>Küçük Adımlarla Öğretim (DTT):</strong> Karmaşık beceriler küçük, kolay öğrenilebilir parçalara bölünerek öğretilir.</li>"
                        + "<li><strong>İpucu Sunma ve Silikleştirme:</strong> Çocuğa doğru yanıtı vermesi için fiziksel, sözel veya görsel ipuçları verilir ve zamanla azaltılır.</li>"
                        + "</ul>")
                .category("Eğitim")
                .author(author)
                .published(true)
                .viewCount(310)
                .format("TEXT")
                .sourceName("Tohum Otizm Vakfı")
                .sourceUrl("https://tohumotizm.org.tr/bilgi-bankasi/aba-tedavisi")
                .build(),

            KnowledgeArticle.builder()
                .title("Otizmli Çocuklarda Uyku Problemleri ve Çözüm Önerileri")
                .content("<p>Otizm spektrumundaki çocukların %50 ila %80'inde uykuya geçişte zorluk, gece sık uyanma ve düzensiz uyku döngüleri gibi problemler görülmektedir. Bu durum hem çocuğun gelişimini hem de ebeveynlerin yaşam kalitesini olumsuz etkiler.</p>"
                        + "<p>Uyku düzenini iyileştirmek için şu adımları takip edebilirsiniz:</p>"
                        + "<ul>"
                        + "<li><strong>Rutin Oluşturun:</strong> Her akşam aynı saatte ılık banyo, kitap okuma veya hafif müzik gibi sakinleştirici uyku öncesi rutinler uygulayın.</li>"
                        + "<li><strong>Duyusal Düzenleme:</strong> Odanın sıcaklığını, yatağın dokusunu ve kıyafetlerin etiketlerini çocuğunuzun hassasiyetlerine göre ayarlayın.</li>"
                        + "<li><strong>Gündüz Aktiviteleri:</strong> Çocuğun gün içinde fiziksel olarak aktif olmasını sağlayarak vücudunun akşam uykuya ihtiyaç duymasını kolaylaştırın.</li>"
                        + "</ul>")
                .category("Sağlık")
                .author(author)
                .published(true)
                .viewCount(185)
                .format("TEXT")
                .build(),

            KnowledgeArticle.builder()
                .title("Otizm ve Beslenme: Glütensiz ve Kazeinsiz Diyetler")
                .content("<p>Son yıllarda yapılan bazı araştırmalar, glüten (buğday, arpa, çavdar) ve kazein (süt ve süt ürünleri) proteinlerinin otizmli bazı çocuklarda sindirim sorunlarına ve buna bağlı davranışsal hassasiyetlere yol açabileceğini öne sürmektedir.</p>"
                        + "<p>Beslenme düzeninde değişiklik yaparken dikkat edilmesi gerekenler:</p>"
                        + "<ul>"
                        + "<li><strong>Uzman Kontrolü:</strong> Kısıtlayıcı diyetler kalsiyum, B vitaminleri ve lif eksikliklerine yol açabileceği için kesinlikle çocuk doktoru ve diyetisyen kontrolünde yürütülmelidir.</li>"
                        + "<li><strong>Yavaş Geçiş:</strong> Çocuğun beslenme alışkanlıklarını aniden değiştirmek yerine glütensiz ve kazeinsiz alternatifleri aşamalı olarak tanıtın.</li>"
                        + "<li><strong>Gıda Günlüğü:</strong> Diyet süresince çocuğun davranışlarında, sindirim sisteminde veya uyku kalitesinde meydana gelen değişiklikleri günlük olarak kaydedin.</li>"
                        + "</ul>")
                .category("Beslenme")
                .author(author)
                .published(true)
                .viewCount(159)
                .format("TEXT")
                .sourceName("Yerli Sağlık Rehberi")
                .build(),

            KnowledgeArticle.builder()
                .title("Evde Yapılabilecek Basit Duyu Bütünleme Aktiviteleri")
                .content("<p>Duyu bütünleme, çevremizden ve vücudumuzdan aldığımız duyusal uyarıları organize etme sürecidir. Ev ortamında yapacağınız küçük oyunlarla çocuğunuzun duyusal işlemleme süreçlerini destekleyebilirsiniz.</p>"
                        + "<p>Evde uygulanabilecek bazı aktiviteler:</p>"
                        + "<ul>"
                        + "<li><strong>Dokunsal Oyunlar:</strong> Tıraş köpüğü, pirinç havuzu, oyun hamuru ve farklı kumaş parçalarıyla oynamak dokunma duyusunu geliştirir.</li>"
                        + "<li><strong>Denge ve Hareket (Vestibüler):</strong> Evde güvenli bir salıncak kurmak, yoga topu üzerinde sallanmak veya trambolinde zıplamak denge duyusunu uyarır.</li>"
                        + "<li><strong>Derin Basınç (Proprioseptif):</strong> Çocuğu rulo şeklinde battaniyeye sarmak (\"sosis oyunu\"), ağır yastıklar taşımak veya yerde sürünmek eklem ve kas duyusuna iyi gelir.</li>"
                        + "</ul>")
                .category("Duyusal Gelişim")
                .author(author)
                .published(true)
                .viewCount(298)
                .format("TEXT")
                .build(),

            KnowledgeArticle.builder()
                .title("Otizm Spektrum Bozukluğu Nedir? İlk Belirtiler Nelerdir?")
                .content("<p>Otizm Spektrum Bozukluğu (OSB) erken dönemde fark edildiğinde, uygun eğitim ve terapilerle çocuğun potansiyeli en üst seviyeye çıkarılabilir. Ebeveynlerin bebeklik ve erken çocukluk döneminde dikkat etmesi gereken kritik belirtiler arasında göz teması eksikliği, ismine tepki vermeme ve taklit etmeme sayılabilir.</p>"
                        + "<p>Bu belirtilerden birkaçını fark eden ebeveynlerin, vakit kaybetmeden bir çocuk gelişim uzmanına veya çocuk nörolojisi/psikiyatrisi uzmanına başvurması önerilir; erken tanı ve erken müdahale, uzun vadeli gelişimi doğrudan olumlu etkiler.</p>")
                .category("Genel")
                .author(author)
                .published(true)
                .viewCount(412)
                .format("TEXT")
                .build(),

            KnowledgeArticle.builder()
                .title("Otizmde Dil ve Konuşma Terapisi Süreci")
                .content("<p>Otizmli çocuklarda dil gelişimi ve iletişim becerilerini artırmak için dil ve konuşma terapistleri (DKT) bireyselleştirilmiş yöntemler uygular. Seansların sıklığı çocuğun ihtiyacına göre haftada bir ile birkaç kez arasında değişebilir.</p>"
                        + "<p>Ebeveynlerin evde konuşmayı desteklemek için uygulayabileceği pratik yöntemler:</p>"
                        + "<ul>"
                        + "<li><strong>Paralel Konuşma:</strong> Çocuğun yaptığı eylemi anlık olarak basit cümlelerle betimleyin.</li>"
                        + "<li><strong>Bekleme Süresi Tanıma:</strong> Bir isteği hemen karşılamak yerine çocuğun iletişim kurması için birkaç saniye bekleyin.</li>"
                        + "<li><strong>Model Olma:</strong> Doğru telaffuz ve cümle yapısını, düzeltmeden önce doğru şekliyle tekrar ederek gösterin.</li>"
                        + "</ul>")
                .category("İletişim")
                .author(author)
                .published(true)
                .viewCount(153)
                .format("TEXT")
                .build()
        );

        knowledgeArticleRepository.saveAll(articles);
        log.info("{} zengin Bilgi Bankası içeriği veritabanına başarıyla yüklendi.", articles.size());
    }

}
