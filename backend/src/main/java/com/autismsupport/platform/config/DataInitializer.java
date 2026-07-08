package com.autismsupport.platform.config;

import com.autismsupport.platform.model.KnowledgeArticle;
import com.autismsupport.platform.model.Tag;
import com.autismsupport.platform.model.User;
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

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private static final String CONTENT_EDITOR_EMAIL = "bilgi.bankasi@otizm-platform.local";

    private final TagRepository tagRepository;
    private final UserRepository userRepository;
    private final KnowledgeArticleRepository knowledgeArticleRepository;
    private final PasswordEncoder passwordEncoder;
    private final EntityManager entityManager;

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
        User editor = getOrCreateContentEditor();

        List<KnowledgeArticle> articles = new ArrayList<>();

        // ---- İLETİŞİM ----
        articles.add(article(editor, "PECS Nedir? Resimle İletişim Kurmayı Öğrenmek", "İletişim", """
                PECS (Resim Değiş Tokuşuna Dayalı İletişim Sistemi), sözel dili henüz kullanamayan çocuklar \
                için resim kartlarıyla iletişim kurmayı öğreten bir yöntemdir. Yöntemin nasıl uygulandığına \
                dair resmi, uzman onaylı kaynağa aşağıdaki bağlantıdan ulaşabilirsiniz.

                Yöntemde çocuk önce basit bir resmi yetişkine uzatarak isteğini belirtmeyi öğrenir; zamanla \
                resim sayısı artar ve resimler cümle şeritlerine dizilerek daha karmaşık istekler ifade \
                edilebilir hale gelir. PECS, çocuğun iletişimi kendiliğinden başlatmasını teşvik ettiği için \
                onu yalnızca yönergeleri izleyen değil, ihtiyacını aktif olarak ifade eden bir iletişimci \
                olmasına yardımcı olabilir.""",
                "Pyramid Educational Consultants (PECS)", "https://pecs.com/picture-exchange-communication-system-pecs/"));

        articles.add(article(editor, "Ekolali: Duyulan Sözcüklerin Tekrarı Ne Anlama Gelir?", "İletişim", """
                Ekolali, duyulan söz veya cümlelerin tekrar edilmesidir ve birçok çocuk için bir dil gelişimi \
                aşaması olabilir. CDC'nin "Learn the Signs. Act Early." programında dil gelişimi ve gelişimsel \
                izlem hakkında güncel, resmi bilgiye ulaşabilirsiniz.

                Tekrar hemen o anda ya da saatler/günler sonra ortaya çıkabilir ve genellikle "anlamsız \
                tekrar" değil, çocuğun bir duyguyu veya isteği ifade etme biçimidir. Ebeveyn olarak tekrarın \
                arkasındaki niyeti anlamaya çalışmak ve çocuğa kendi cümlelerini kurması için zaman tanımak, \
                bu süreci desteklemenin önemli bir parçasıdır.""",
                "CDC – Learn the Signs. Act Early.", "https://www.cdc.gov/act-early/index.html"));

        articles.add(article(editor, "Göz Teması ve Beden Diliyle İletişim", "İletişim", """
                Otizmli çocuklarda göz teması ve sözel olmayan iletişim biçimleri farklılık gösterebilir. \
                National Autistic Society'nin (İngiltere) resmi iletişim rehberinde bu farklılıklar ve \
                destekleyici yaklaşımlar ayrıntılı olarak anlatılmaktadır.

                Göz teması kurmakta zorlanmak ilgisizlik anlamına gelmez; birçok otizmli çocuk için bu, \
                rahatsız edici ya da dikkat dağıtıcı bir deneyim olabilir. Çocuğu göz temasına zorlamak \
                yerine, işaret etme, nesneyi gösterme ya da elinden tutma gibi kendi tarzındaki iletişim \
                biçimlerini fark edip desteklemek daha etkili bir yaklaşımdır.""",
                "National Autistic Society (İngiltere)", "https://www.autism.org.uk/advice-and-guidance/about-autism/autism-and-communication"));

        articles.add(article(editor, "Karşılıklı Sohbeti Adım Adım Desteklemek", "İletişim", """
                Karşılıklı sohbet, sırayla konuşma ve dinlemeyi içeren, adım adım desteklenebilecek bir \
                beceridir. Amerikan Pediatri Akademisi'nin HealthyChildren.org sitesinde aileler için pratik, \
                uzman onaylı öneriler yer almaktadır.

                Bu beceriyi desteklemenin iyi bir başlangıç noktası, çocuğun kendi ilgi alanını konuşmaya \
                köprü olarak kullanmaktır: sevdiği bir konu üzerinden kısa sorular sorup cevap için bolca \
                zaman tanımak, görsel kartlarla "sıra kimde" kavramını somutlaştırmak işe yarayabilir. \
                Önemli olan sohbetin kusursuz akması değil, çocuğun iletişim kurma girişiminde \
                bulunmasıdır.""",
                "HealthyChildren.org (Amerikan Pediatri Akademisi)", "https://www.healthychildren.org/English/health-issues/conditions/Autism/Pages/Autism-Spectrum-Disorder.aspx"));

        // ---- DAVRANIŞ ----
        articles.add(article(editor, "Meltdown (Duyusal Kriz) Anında Ebeveyn Ne Yapabilir?", "Davranış", """
                Meltdown, çocuğun kontrol edemediği yoğun bir duyusal ya da duygusal yüklenme tepkisidir. \
                National Autistic Society'nin resmi meltdown rehberinde, bir meltdown anında ve sonrasında \
                neler yapılabileceği adım adım anlatılmaktadır.

                Bir meltdown sırasında yapılabilecekler arasında ortamı sakinleştirmek (ışığı kısmak, sesi \
                azaltmak), çocuğa toparlanması için zaman tanımak ve güvenli, sakin bir alan yaratmak \
                sayılabilir. Bu anda ceza vermeye çalışmak ya da ısrarla açıklama istemek durumu genellikle \
                ağırlaştırır; olay sonrasında tetikleyiciyi birlikte düşünmek benzer durumları önceden fark \
                etmeye yardımcı olabilir.""",
                "National Autistic Society (İngiltere)", "https://www.autism.org.uk/advice-and-guidance/behaviour/meltdowns/all-audiences"));

        articles.add(article(editor, "Duyusal Aşırı Yüklenmeyi Tanımak ve Azaltmak", "Davranış", """
                Duyusal işlemleme farklılıkları, bazı uyaranlara aşırı, bazılarına ise düşük duyarlılığa yol \
                açabilir. STAR Institute for Sensory Processing, duyusal değerlendirme ve destek yöntemleri \
                konusunda kapsamlı, uzman kaynaklı içerik sunmaktadır.

                Otizmli çocuklarda bazı duyulara aşırı, bazılarına ise düşük duyarlılık bir arada \
                görülebilir; örneğin yüksek sese aşırı tepki verirken ağrıya karşı daha az duyarlı \
                olabilirler. Işığı kısmak, gürültüyü azaltmak, rahatsız edici dokulardan kaçınmak gibi küçük \
                çevresel düzenlemeler, bazı çocuklar için kulaklık ya da ağırlıklı battaniye gibi araçlarla \
                desteklenebilir.""",
                "STAR Institute for Sensory Processing", "https://sensoryhealth.org/"));

        articles.add(article(editor, "Rutinler Neden Önemli, Değişikliğe Nasıl Hazırlanılır?", "Davranış", """
                Öngörülebilir rutinler, otizmli çocuklarda belirsizliğin yarattığı kaygıyı azaltmaya yardımcı \
                olabilir. Autism Speaks'in okul çağı çocukları için hazırladığı resmi rehberde, değişikliklere \
                hazırlık ve geçiş stratejilerine dair ayrıntılı bilgi bulunmaktadır.

                Rutinler ve öngörülebilirlik, otizmli birçok çocuk için belirsizliğin yarattığı kaygıyı \
                azaltan bir güvenlik alanı sağlar. Görsel günlük programlar, bir etkinlikten diğerine geçişi \
                önceden haber veren sayaçlar ve planlı değişiklikleri birkaç gün önceden basit cümlelerle \
                anlatmak, ani sürprizlere kıyasla çok daha az strese yol açar.""",
                "Autism Speaks – 100 Day Kit", "https://www.autismspeaks.org/tool-kit/100-day-kit-school-age-children"));

        articles.add(article(editor, "Tekrarlayan Hareketler (Stereotipi) Hakkında Bilinmesi Gerekenler", "Davranış", """
                El çırpma, sallanma gibi tekrarlayan hareketler ("stimming") genellikle kendini düzenleme \
                işlevi görür. CDC'nin resmi otizm sayfasında bu davranışların özellikleri ve ne zaman uzman \
                desteği alınması gerektiği anlatılmaktadır.

                Bu hareketler genellikle çocuğun kendini sakinleştirmesine ya da yoğun bir duyguyu ifade \
                etmesine yarar ve çoğu zaman zararsızdır; mutlaka "düzeltilmesi" gerekmez. Davranış kendine \
                veya başkalarına zarar veriyorsa ya da günlük yaşamı belirgin şekilde kısıtlıyorsa, bir \
                uzmanla birlikte güvenli alternatifler planlanabilir.""",
                "CDC – Autism Spectrum Disorder", "https://www.cdc.gov/autism/about/index.html"));

        // ---- EĞİTİM ----
        articles.add(article(editor, "Bireyselleştirilmiş Eğitim Programı (BEP) Nedir?", "Eğitim", """
                Bireyselleştirilmiş Eğitim Programı (BEP), özel eğitim ihtiyacı olan öğrenciler için aile, \
                öğretmen ve uzmanların birlikte hazırladığı bir plandır. Sürecin resmi işleyişine dair kılavuza \
                MEB Özel Eğitim ve Rehberlik Hizmetleri Genel Müdürlüğü sayfasından ulaşabilirsiniz.""",
                "MEB Özel Eğitim ve Rehberlik Hizmetleri Genel Müdürlüğü", "https://orgm.meb.gov.tr/www/bireysellestirilmis-egitim-programi/icerik/2097"));

        articles.add(article(editor, "Uygulamalı Davranış Analizi (ABA) Temel İlkeleri", "Eğitim", """
                Uygulamalı Davranış Analizi (ABA), öğrenme ilkelerine dayanan, kanıt temelli bir öğretim \
                yaklaşımıdır. Autism Speaks'in resmi ABA rehberinde yöntemin ilkeleri ve uygulamada dikkat \
                edilmesi gerekenler ayrıntılı olarak anlatılmaktadır.

                ABA'da hedef beceriler küçük, öğretilebilir parçalara bölünür ve olumlu pekiştirme ile \
                desteklenir; etkili bir program çocuğun ilgi alanlarına ve gelişim düzeyine göre \
                bireyselleştirilir, herkese uyan tek bir kalıp değildir. Bir terapi yöntemine başlamadan önce \
                uygulayıcının yeterliliklerini ve yöntemin çocuğunuza uygunluğunu değerlendirmeniz \
                önemlidir.""",
                "Autism Speaks", "https://www.autismspeaks.org/applied-behavior-analysis"));

        articles.add(article(editor, "Erken Tanı ve Erken Müdahale Neden Fark Yaratır?", "Eğitim", """
                Erken yaşta başlayan destek programları, gelişim üzerinde belirgin olumlu etkiler \
                sağlayabilir. CDC'nin resmi otizm sayfasında erken tanı ve erken müdahalenin önemine dair \
                güncel bilgiler bulunmaktadır.

                Gelişimsel izlem, çocuğun yaşına uygun basamaklara (ilk kelimeler, ismine tepki verme, \
                işaret etme gibi) ulaşıp ulaşmadığını düzenli takip etmek anlamına gelir. Bir basamakta \
                gecikme fark ettiğinizde "zamanla geçer" diye beklemek yerine çocuk doktorunuzla paylaşmanız, \
                gerekirse erken destek hizmetlerine yönlendirme kapısını açar.""",
                "CDC – Autism Spectrum Disorder (ASD)", "https://www.cdc.gov/autism/index.html"));

        articles.add(article(editor, "TOHUM Otizm Vakfı Eğitim Portalı: Ücretsiz Kaynaklara Erişim", "Eğitim", """
                TOHUM Otizm Vakfı, aileler ve uzmanlar için ücretsiz eğitim videoları ve materyalleri sunan \
                bir çevrim içi portal işletmektedir. Vakfın resmi sitesinden Danışma Birimi'ne ulaşarak \
                yönlendirme desteği de alabilirsiniz.""",
                "TOHUM Otizm Vakfı", "https://tohumotizm.org.tr/"));

        // ---- SAĞLIK ----
        articles.add(article(editor, "Otizm Spektrum Bozukluğu Nedir? Genel Bir Bakış", "Sağlık", """
                Otizm spektrum bozukluğu, sosyal iletişim ve davranışta farklılıklarla kendini gösteren, \
                yaşam boyu süren bir nörogelişimsel durumdur. Dünya Sağlık Örgütü'nün (WHO) resmi bilgi \
                sayfası, kapsamlı ve güncel bir genel bakış sunmaktadır.

                "Spektrum" ifadesi, otizmli bireyler arasında destek ihtiyacının ve güçlü yönlerin çok geniş \
                bir yelpazede değişebildiğini vurgular; otizmin tek bir nedeni yoktur, genetik ve çevresel \
                birçok etkenin bir araya gelmesiyle ortaya çıktığı düşünülmektedir. Otizm, ebeveynlik \
                tarzından kaynaklanmaz ve tedavi edilmesi gereken bir hastalık değil, yaşam boyu süren bir \
                farklılık olarak ele alınır.""",
                "Dünya Sağlık Örgütü (WHO)", "https://www.who.int/news-room/fact-sheets/detail/autism-spectrum-disorders"));

        articles.add(article(editor, "Türkiye'de Tanı Süreci Nasıl İşler?", "Sağlık", """
                Türkiye'de otizm tanısı çocuk psikiyatristleri ve nörologlar tarafından konulur. T.C. Aile ve \
                Sosyal Hizmetler Bakanlığı'nın Engelli ve Yaşlı Hizmetleri Genel Müdürlüğü sayfasında tanı \
                süreci ve yönlendirme hizmetleri hakkında resmi bilgi bulunmaktadır.""",
                "T.C. Aile ve Sosyal Hizmetler Bakanlığı (Engelli ve Yaşlı Hizmetleri Genel Müdürlüğü)",
                "https://ailevecalisma.gov.tr/eyhgm/sayfalar/otizm-spektrum-bozuklugu/"));

        articles.add(article(editor, "Uyku, Beslenme ve Eşlik Eden Sağlık Konuları", "Sağlık", """
                Uyku güçlükleri, seçici beslenme ve kaygı gibi durumlar otizmli çocuklarda sık görülebilir. \
                T.C. Sağlık Bakanlığı'nın resmi otizm farkındalık sayfasında bu konulara dair genel bilgilere \
                ulaşabilirsiniz.""",
                "T.C. Sağlık Bakanlığı", "https://www.saglik.gov.tr/TR,19827/otizmin-farkindayim-farkliliklara-saygiliyim.html"));

        articles.add(article(editor, "Gelişimsel Basamaklar: Ne Zaman Uzmana Danışılmalı?", "Sağlık", """
                Yaşa göre gelişimsel basamakları (ilk kelimeler, ismine tepki verme gibi) takip etmek, olası \
                bir gecikmeyi erken fark etmeye yardımcı olur. CDC'nin "Learn the Signs. Act Early." programı, \
                yaşa özel resmi kontrol listeleri sunmaktadır.

                Çocuğunuz bir ya da birden fazla basamağı beklenen yaşta göstermiyorsa, önceden kazandığı bir \
                beceriyi kaybetmişse ya da içinizde başka bir endişe varsa, beklemek yerine çocuk \
                doktorunuzla konuşmanız önerilir. Erken değerlendirme, gerektiğinde erken destek \
                hizmetlerine yönlendirme sürecini başlatır.""",
                "CDC – Learn the Signs. Act Early.", "https://www.cdc.gov/act-early/milestones/index.html"));

        articles.add(article(editor, "Otizm Taraması Tanı Değildir: 18 ve 24 Ay Kontrolleri", "Sağlık", """
                Otizm taraması, çocuğun gelişimini izleyen rutin sağlık kontrollerinin bir parçası olan kısa \
                bir risk değerlendirmesidir; tek başına tanı koymaz. Amerikan Pediatri Akademisi (AAP), tüm \
                çocukların 18 ve 24 aylık sağlam çocuk kontrollerinde otizm açısından taranmasını ve düzenli \
                gelişimsel izlemin sürdürülmesini önermektedir.

                Tarama sonucunda risk görülmesi ya da hekim/aile gözlemlerinde gelişimsel gecikme fark \
                edilmesi, çocuğun daha ayrıntılı tanısal değerlendirmeye yönlendirilmesi gerektiğini gösterir. \
                Belirgin bir gelişimsel gecikme varsa destek hizmetlerine başlamak için kesin otizm tanısını \
                beklemek gerekmez; erken yönlendirme, çocuğun iletişim, oyun ve günlük yaşam becerilerini \
                desteklemek açısından zaman kazandırır.""",
                "American Academy of Pediatrics (AAP)", "https://www.aap.org/en/patient-care/autism/"));

        // ---- AİLE ----
        articles.add(article(editor, "Tanı Sonrası İlk 100 Gün: Nereden Başlamalı?", "Aile", """
                Tanı sonrası ilk dönemde nereden başlanacağını bilmek zor olabilir. Autism Speaks'in "100 \
                Günlük Rehberi", yeni tanı almış küçük çocukların aileleri için resmi, adım adım bir kaynaktır.

                Tanı haberini almak birçok aile için yoğun duygularla (şok, üzüntü, bazen rahatlama) gelir ve \
                bunların hepsi doğaldır. İlk günlerde her şeyi aynı anda çözmeye çalışmak yerine küçük \
                adımlar atmak (temel bilgi edinmek, bir destek grubuna katılmak, gerekli belgeleri düzenli \
                tutmak) daha sürdürülebilir bir yoldur.""",
                "Autism Speaks – 100 Day Kit", "https://www.autismspeaks.org/tool-kit/100-day-kit-young-children"));

        articles.add(article(editor, "Kardeşlerle Sağlıklı İletişim Kurmak", "Aile", """
                Otizmli bir kardeşe sahip olmak, çocuklar için farklı duygusal deneyimler getirebilir. Autism \
                Speaks'in kardeşlere özel resmi rehberinde yaşa uygun açıklamalar ve destek önerileri yer \
                almaktadır.

                Kardeşlere yaşlarına uygun, basit ve dürüst açıklamalar yapmak, onların da süreci \
                anlamlandırmasına yardımcı olur. Her çocuğa ayrı, bölünmemiş zaman ayırmaya çalışmak ve \
                kardeşleri sürece pozitif şekillerde dahil etmek, aile içi bağı güçlendirebilir.""",
                "Autism Speaks – A Sibling's Guide to Autism", "https://www.autismspeaks.org/tool-kit/siblings-guide-autism"));

        articles.add(article(editor, "Ebeveyn Olarak Kendinize Nasıl Bakarsınız?", "Aile", """
                Otizmli bir çocuğa destek olmak yorucu olabilir; ebeveyn tükenmişliği önemsenmesi gereken bir \
                konudur. National Autistic Society'nin resmi sitesinde aileler ve bakım verenler için destek \
                kaynaklarına ulaşabilirsiniz.

                Kendi ihtiyaçlarınızı sürekli ertelemek uzun vadede ne size ne de çocuğunuza yarar sağlar. \
                Küçük, düzenli mola anları yaratmak, sorumluluğu güvendiğiniz biriyle paylaşmak ve benzer \
                deneyimleri yaşayan diğer ebeveynlerle bir araya gelmek yalnızlık hissini azaltabilir.""",
                "National Autistic Society (İngiltere)", "https://www.autism.org.uk/"));

        articles.add(article(editor, "Türkiye'de Otizmli Bireyler İçin Sosyal Haklar ve Destekler", "Aile", """
                Türkiye'de otizmli bireyler, engelli sağlık kurulu raporu sonrasında çeşitli eğitim ve sosyal \
                destek hizmetlerinden yararlanabilir. T.C. Aile ve Sosyal Hizmetler Bakanlığı'nın resmi "Aile \
                Bilgilendirme Rehberi", bu hizmetleri ayrıntılı olarak anlatmaktadır.""",
                "T.C. Aile ve Sosyal Hizmetler Bakanlığı – Aile Bilgilendirme Rehberi",
                "https://www.aile.gov.tr/media/5617/otizm-spektrum-bozukluklari-aile-bilgilendirme-rehberi-2016-indirmek-icin-tiklayiniz.pdf"));

        // ---- GENEL ----
        articles.add(article(editor, "Otizm Bir Spektrumdur: Çeşitliliği Anlamak", "Genel", """
                Otizm, destek ihtiyacı ve güçlü yönleri kişiden kişiye büyük ölçüde değişen bir spektrumdur. \
                TOHUM Otizm Vakfı'nın resmi otizm tanım sayfasında bu çeşitlilik ve temel kavramlar \
                anlatılmaktadır.""",
                "TOHUM Otizm Vakfı", "https://tohumotizm.org.tr/otizm/otizm-spektrum-bozuklugu/"));

        articles.add(article(editor, "Otizmle İlgili Yaygın Yanlış Bilgiler", "Genel", """
                Otizm hakkında yıllar içinde çok sayıda yanlış bilgi yayılmıştır; bu nedenle güvenilir, \
                bilimsel kaynaklara başvurmak önemlidir. Dünya Sağlık Örgütü'nün (WHO) otizmle ilgili güncel \
                açıklamasına aşağıdaki resmi bağlantıdan ulaşabilirsiniz.

                Bilimsel kanıtlara göre aşılar otizme neden olmaz; otizm ebeveynlik tarzından ya da çocuğun \
                sevgi görmemesinden kaynaklanmaz. Otizmli bireyler duygusal olarak "hissiz" değildir, \
                duygularını ve empatilerini farklı biçimlerde ifade edebilirler; herkese uyan tek bir \
                "tedavi" yoktur ama doğru destekle yaşam kalitesi büyük ölçüde artırılabilir.""",
                "Dünya Sağlık Örgütü (WHO)", "https://www.who.int/europe/news/item/24-09-2025-who-statement-on-autism-related-issues"));

        articles.add(article(editor, "Kız Çocuklarında Otizm Neden Farklı Görünebilir?", "Genel", """
                Otizmli kız çocukları sosyal zorluklarını taklit yoluyla gizleme eğiliminde olabilir, bu da \
                tanının gecikmesine yol açabilir. National Autistic Society'nin "Otizmli Kadınlar ve Kızlar" \
                sayfasında bu konuya dair resmi, ayrıntılı bilgi bulunmaktadır.

                Bu çocuklar arkadaşlarını gözlemleyip sosyal davranışları taklit ederek zorlandıkları \
                alanları dışarıdan daha az belli edebilirler. Çocuğunuz sosyal ortamlarda "idare ediyor" gibi \
                görünse bile evde yoğun bir yorgunluk ya da kaygı yaşıyorsa, bu durumu bir uzmanla \
                paylaşmanız önemlidir.""",
                "National Autistic Society (İngiltere)", "https://www.autism.org.uk/advice-and-guidance/identity/autistic-women-and-girls"));

        articles.add(article(editor, "Toplumda Otizm Farkındalığı ve Kapsayıcılık", "Genel", """
                Toplumsal farkındalık ve kapsayıcı ortamlar, otizmli bireylerin günlük yaşama katılımını \
                kolaylaştırır. T.C. Aile ve Sosyal Hizmetler Bakanlığı'nın otizm.gov.tr platformuna ilişkin \
                resmi duyurusuna aşağıdaki bağlantıdan ulaşabilirsiniz.""",
                "T.C. Aile ve Sosyal Hizmetler Bakanlığı",
                "https://www.aile.gov.tr/haberler/otizmli-bireyler-ve-aileleri-icin-otizm-gov-tr-platformu-hayata-gecirildi/"));

        // ---- İLETİŞİM (ek) ----
        articles.add(article(editor, "Destekleyici ve Alternatif İletişim (AAC) Nedir?", "İletişim", """
                Destekleyici ve Alternatif İletişim (AAC), sözel dili sınırlı olan bireyler için resim, sembol, \
                cihaz veya işaret dili gibi yöntemlerle iletişimi destekleyen bir yaklaşımdır. ASHA'nın \
                (Amerikan Konuşma-Dil-İşitme Derneği) resmi AAC sayfasında bu yöntemler ayrıntılı olarak \
                anlatılmaktadır.

                AAC, sözel dili hiç kullanamayan ya da sınırlı kullanan bireyler için resim kartlarından göz \
                izleme teknolojisiyle çalışan konuşma cihazlarına kadar geniş bir yelpazede araç sunar. Doğru \
                AAC yönteminin seçimi kişiye özeldir; bir konuşma ve dil terapistiyle birlikte \
                değerlendirilmesi, çocuğun iletişim ihtiyaçlarına en uygun aracın bulunmasını sağlar.""",
                "ASHA (American Speech-Language-Hearing Association)", "https://www.asha.org/public/speech/disorders/aac/"));

        articles.add(article(editor, "Sosyal Öyküler (Social Stories) Nedir?", "İletişim", """
                Sosyal öyküler, otizmli çocuklara sosyal durumları ve beklenen davranışları basit, görsel \
                destekli anlatımlarla açıklayan bir yöntemdir. Yöntemin geliştiricisi Carol Gray'in resmi \
                sitesinde uygulama ilkeleri ve örnekler yer almaktadır.

                Bir sosyal öykü genellikle bir durumu, ilgili sosyal ipuçlarını ve beklenen tepkileri sakin, \
                betimleyici bir dille anlatır; abartılı ya da yönlendirici olmaktan kaçınır. Yöntem özellikle \
                yeni veya kaygı yaratan durumlara (doktor ziyareti, okula başlama gibi) hazırlanırken sıkça \
                kullanılır.""",
                "Carol Gray – Social Stories", "https://carolgraysocialstories.com/social-stories/social-stories-overview/"));

        // ---- DAVRANIŞ (ek) ----
        articles.add(article(editor, "Güvenlik: Kaybolma (Wandering) Riskine Karşı Önlemler", "Davranış", """
                Otizmli bazı çocuklarda kaybolma/uzaklaşma eğilimi (wandering) görülebilir ve bu, ailelerin en \
                çok endişe duyduğu güvenlik konularından biridir. Autism Speaks'in resmi kaybolma önleme \
                sayfasında evde, okulda ve toplumda alınabilecek önlemler anlatılmaktadır.

                Aileler için önerilen adımlar arasında evde ek kilit/alarm sistemleri kullanmak, çocuğun \
                kimlik bilgisini taşıyan bir bileklik ya da GPS takip cihazı bulundurmak, komşulara ve okula \
                durumu önceden bildirmek yer alır. Bir acil durum planı hazırlamak ve düzenli olarak \
                güncellemek, riskleri azaltmada önemli bir adımdır.""",
                "Autism Speaks", "https://www.autismspeaks.org/wandering-prevention"));

        articles.add(article(editor, "Öz-Düzenleme ve Kaygıyla Baş Etmeyi Desteklemek", "Davranış", """
                Otizmli bireylerde kaygı ve duygu düzenleme güçlükleri sık görülebilir. İngiltere merkezli \
                otizm araştırma kuruluşu Autistica, otizmli bireyler ve aileleri için kanıt temelli, ücretsiz \
                kaynaklar ve uygulamalar sunmaktadır.

                Kaygıyı tetikleyen durumları önceden fark etmek, sakinleşme molaları planlamak ve duyguları \
                adlandırmayı desteklemek, otizmli bireylerin öz-düzenleme becerilerini geliştirmesine \
                yardımcı olabilir. Bu alanda uzmanlaşmış bir terapistle çalışmak, kişiye özel stratejiler \
                geliştirmek açısından faydalı olabilir.""",
                "Autistica (İngiltere)", "https://www.autistica.org.uk/"));

        // ---- EĞİTİM (ek) ----
        articles.add(article(editor, "Floortime (DIR Modeli) Nedir?", "Eğitim", """
                DIRFloortime, çocuğun ilgisini ve liderliğini takip ederek duygusal, sosyal ve iletişimsel \
                gelişimi desteklemeyi amaçlayan oyun temelli bir yaklaşımdır. Yöntemin resmi eğitim kurumu \
                ICDL'nin sitesinde modelin ilkeleri ve eğitim programları anlatılmaktadır.

                Floortime'da yetişkin, çocuğun o anki ilgisine (bir oyuncakla oynama biçimi, tekrar ettiği \
                bir hareket gibi) katılarak etkileşimi çocuğun dünyasından başlatır ve yavaş yavaş karşılıklı \
                iletişim çemberlerini genişletir. Yaklaşım, doğrudan beceri öğretiminden çok duygusal bağ ve \
                iletişim motivasyonunu güçlendirmeyi hedefler.""",
                "ICDL (Interdisciplinary Council on Development and Learning)", "https://www.icdl.com/"));

        articles.add(article(editor, "RAM (Rehberlik ve Araştırma Merkezi) Süreci Nasıl İşler?", "Eğitim", """
                Rehberlik ve Araştırma Merkezleri (RAM), özel eğitim ihtiyacı olan çocukların değerlendirilmesi \
                ve uygun eğitim ortamına yönlendirilmesi için MEB'e bağlı çalışan resmi kurumlardır. MEB'in RAM \
                işleyiş raporunda süreç ayrıntılı olarak anlatılmaktadır.""",
                "MEB Özel Eğitim ve Rehberlik Hizmetleri Genel Müdürlüğü",
                "https://orgm.meb.gov.tr/meb_iys_dosyalar/2025_02/04174123_32024mebramraporu3.pdf"));

        // ---- SAĞLIK (ek) ----
        articles.add(article(editor, "Otizm Tanı Kriterleri Nasıl Belirlenir?", "Sağlık", """
                Otizm tanısı, Dünya Sağlık Örgütü'nün ICD-11 sınıflandırması gibi uluslararası kabul görmüş \
                tanı kriterlerine dayanılarak konur. Autism Europe'un resmi sayfasında WHO'nun otizmi nasıl \
                sınıflandırdığı sade bir dille özetlenmektedir.

                ICD-11'de otizm, tek bir spektrum olarak ele alınır ve önceki sınıflandırmalardaki ayrı alt \
                tipler (örneğin Asperger sendromu) kaldırılmıştır; tanı, sosyal iletişimde kalıcı güçlükler \
                ile sınırlı, tekrarlayan davranış örüntülerinin birlikte ve birden fazla ortamda görülmesine \
                dayanır. Kesin tanı her zaman bu alanda uzmanlaşmış bir hekim tarafından konulmalıdır.""",
                "Autism Europe", "https://www.autismeurope.org/about-autism/whos-classification-of-autism/"));

        articles.add(article(editor, "Ergenlik Dönemi ve Otizm", "Sağlık", """
                Ergenlik, otizmli gençler ve aileleri için bedensel değişiklikler, hijyen ve sosyal beklentiler \
                açısından ek bir hazırlık gerektirebilir. Autism Speaks'in resmi ergenlik ve buluğ rehberinde bu \
                konularda ailelere yönelik pratik bilgiler yer almaktadır.

                Rehberde hijyen alışkanlıklarının nasıl öğretilebileceği, bedensel değişikliklerin basit ve \
                somut şekilde nasıl anlatılabileceği, sosyal sınırlar ve güvenlik konularında nasıl \
                konuşulabileceği gibi başlıklar ele alınır. Bu dönemde ailenin sabırlı ve tutarlı bir \
                yaklaşım sürdürmesi, gencin değişimlere uyum sağlamasını kolaylaştırabilir.""",
                "Autism Speaks", "https://www.autismspeaks.org/tool-kit/atnair-p-puberty-and-adolescence-resource"));

        // ---- AİLE (ek) ----
        articles.add(article(editor, "Yetişkinlikte İstihdam: İş Koçluğu Desteği", "Aile", """
                Türkiye İş Kurumu (İŞKUR), otizmli yetişkin bireylere iş koçu desteğiyle istihdam sağlanmasına \
                yönelik bir program yürütmektedir. Kurumun resmi duyurusunda bu desteğin kapsamı \
                anlatılmaktadır.""",
                "Türkiye İş Kurumu (İŞKUR)",
                "https://www.iskur.gov.tr/haberler/iskur-otizmli-bireylere-is-koclu-istihdam-destegi-sagliyor/"));

        articles.add(article(editor, "Otizmli Bireylerin Yasal Hakları (5378 Sayılı Kanun)", "Aile", """
                5378 sayılı Engelliler Hakkında Kanun, engelli bireylerin eğitim, istihdam, erişilebilirlik ve \
                sosyal yaşama katılım haklarını düzenleyen temel kanundur. Kanunun güncel ve resmi metnine \
                mevzuat.gov.tr üzerinden ulaşabilirsiniz.""",
                "T.C. Mevzuat Bilgi Sistemi", "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5378&MevzuatTur=1&MevzuatTertip=5"));

        // ---- GENEL (ek) ----
        articles.add(article(editor, "Nörolojik Çeşitlilik (Nörodiversite) Yaklaşımı Nedir?", "Genel", """
                Nörodiversite yaklaşımı, otizmi bir "bozukluk" olarak değil, insan beyninin doğal bir \
                çeşitliliği olarak ele alır. National Autistic Society'nin resmi sayfasında bu yaklaşımın \
                kökeni ve günümüzdeki tartışmaları anlatılmaktadır.

                Bu yaklaşıma göre otizm, "düzeltilmesi gereken" bir eksiklik değil, insan beyninin doğal \
                çeşitliliğinin bir parçasıdır; destek ihtiyaçları gerçek ve önemli olsa da, kimlik olarak \
                otizm birçok otizmli birey tarafından benimsenmektedir. Bu bakış açısı, günümüzde hem \
                savunuculuk hem de klinik uygulama alanlarında giderek daha fazla tartışılmaktadır.""",
                "National Autistic Society (İngiltere)", "https://www.autism.org.uk/advice-and-guidance/identity/the-neurodiversity-movement"));

        articles.add(article(editor, "Güncel Otizm Araştırmaları Nereden Takip Edilir?", "Genel", """
                Otizm bilimi hızla gelişen bir alandır. Güncel araştırmaları takip etmek isteyen aileler ve \
                uzmanlar için Simons Foundation'ın otizm araştırma girişimi SFARI, bağımsız gazetecilik \
                ilkeleriyle hazırlanmış haberler ve özetler sunmaktadır.

                SFARI'nin haber platformu Spectrum, genetik, beyin görüntüleme ve müdahale araştırmalarındaki \
                gelişmeleri hem uzmanlar hem de meraklı aileler için anlaşılır bir dilde özetlemektedir. \
                Bilimsel gelişmeleri takip etmek, tedavi ve destek yöntemleri hakkında bilinçli kararlar \
                almanıza yardımcı olabilir.""",
                "SFARI (Simons Foundation Autism Research Initiative)", "https://www.sfari.org/"));

        List<KnowledgeArticle> newOnes = articles.stream()
                .filter(a -> a.getSourceUrl() == null || !knowledgeArticleRepository.existsBySourceUrl(a.getSourceUrl()))
                .toList();
        knowledgeArticleRepository.saveAll(newOnes);
        log.info("{} yeni bilgi bankası kaynak yönlendirmesi eklendi ({} zaten mevcuttu).",
                newOnes.size(), articles.size() - newOnes.size());
    }

    private User getOrCreateContentEditor() {
        return userRepository.findByEmail(CONTENT_EDITOR_EMAIL).orElseGet(() -> {
            byte[] randomBytes = new byte[24];
            new SecureRandom().nextBytes(randomBytes);
            String randomPassword = Base64.getEncoder().encodeToString(randomBytes);

            User created = User.builder()
                    .fullName("Bilgi Bankası Editör Kurulu")
                    .email(CONTENT_EDITOR_EMAIL)
                    .passwordHash(passwordEncoder.encode(randomPassword))
                    .role(UserRole.ADMIN)
                    .expertTitle("Uzman Danışma Kurulu")
                    .verified(true)
                    .kvkkConsent(true)
                    .matchingEnabled(false)
                    .acceptingPatients(false)
                    .build();
            return userRepository.save(created);
        });
    }

    private KnowledgeArticle article(User author, String title, String category, String content,
                                      String sourceName, String sourceUrl) {
        return KnowledgeArticle.builder()
                .title(title)
                .content(content)
                .category(category)
                .author(author)
                .published(true)
                .format("TEXT")
                .sourceName(sourceName)
                .sourceUrl(sourceUrl)
                .build();
    }
}
