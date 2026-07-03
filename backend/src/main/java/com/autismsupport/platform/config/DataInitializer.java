package com.autismsupport.platform.config;

import com.autismsupport.platform.model.KnowledgeArticle;
import com.autismsupport.platform.model.Tag;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.model.UserRole;
import com.autismsupport.platform.repository.KnowledgeArticleRepository;
import com.autismsupport.platform.repository.TagRepository;
import com.autismsupport.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
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

    @Value("${app.bootstrap.admin-email:}")
    private String bootstrapAdminEmail;

    @Value("${app.bootstrap.admin-password:}")
    private String bootstrapAdminPassword;

    @Override
    @Transactional
    public void run(String... args) {
        initAdminUser();
        initTags();
        initParentCoordinates();
        initKnowledgeArticles();
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

    /**
     * Bilgi Bankası'nı, güvenilir uluslararası ve ulusal kaynaklara (WHO, CDC, FDA, AAP, MEB vb.)
     * dayanan, kaynakçalı başlangıç içerikleriyle doldurur. Sadece bilgi bankası tamamen
     * boşsa çalışır; mevcut/uzman içeriklerinin üzerine yazmaz.
     */
    private void initKnowledgeArticles() {
        if (knowledgeArticleRepository.count() > 0) return;

        log.info("Bilgi Bankası başlangıç içerikleri (güvenilir kaynaklara dayalı) ekleniyor...");

        User editor = getOrCreateContentEditor();

        List<KnowledgeArticle> articles = List.of(
            article(editor, "Otizm Spektrum Bozukluğu (OSB) Nedir?", "Sağlık", """
                <p>Otizm spektrum bozukluğu (OSB), beynin gelişimiyle ilişkili, sosyal iletişim ve etkileşimde \
                farklılıklar ile sınırlı, tekrarlayıcı davranış ve ilgi kalıplarıyla kendini gösteren bir grup \
                durumu tanımlar. Dünya Sağlık Örgütü'ne (WHO) göre otizm bir hastalık değil, nörogelişimsel bir \
                farklılıktır ve belirtileri kişiden kişiye büyük ölçüde değişir; bu nedenle "spektrum" (tayf) \
                ifadesi kullanılır.</p>

                <h3>Ne sıklıkla görülür?</h3>
                <p>WHO'nun küresel tahminine göre dünya genelinde yaklaşık her 127 kişiden biri otizm \
                spektrumundadır; düşük ve orta gelirli ülkelerde gerçek oran hâlâ tam olarak bilinmemektedir çünkü \
                tanı olanakları sınırlıdır. ABD Hastalık Kontrol ve Önleme Merkezi'nin (CDC) 2022 verilerine \
                dayanan ve Nisan 2025'te yayımlanan en güncel ADDM Ağı raporuna göre 8 yaşındaki çocuklarda görülme \
                sıklığı yaklaşık 31'de 1'dir; erkek çocuklarda bu oran kızlara göre belirgin şekilde daha \
                yüksektir.</p>

                <h3>Otizmin temel özellikleri</h3>
                <ul>
                <li>Sosyal iletişim ve karşılıklı etkileşimde farklılıklar (göz teması, jest-mimik kullanımı, \
                akran ilişkileri)</li>
                <li>Sınırlı, tekrarlayıcı davranış, ilgi veya aktivite kalıpları (rutine bağlılık, tekrarlayan \
                hareketler, yoğun özel ilgiler)</li>
                <li>Duyusal uyaranlara (ses, ışık, doku, tat) aşırı veya az tepki</li>
                </ul>
                <p>Bu özellikler her bireyde farklı derece ve kombinasyonlarda görülür; bazı otistik bireyler \
                bağımsız yaşarken bazıları yaşam boyu desteğe ihtiyaç duyabilir. Otizmin tek bir nedeni yoktur; \
                genetik ve nörogelişimsel etkenlerin bir arada rol oynadığı düşünülmektedir. Bilimsel kanıtlar \
                aşıların otizme neden olmadığını açıkça ortaya koymaktadır — Dünya Sağlık Örgütü'nün Aralık \
                2025'te 2010-2025 yılları arasındaki 31 birincil araştırmayı değerlendiren uzman grup analizi de \
                bu sonucu bir kez daha doğrulamıştır.</p>

                <h3>Sık görülen birlikte durumlar</h3>
                <p>Otizmli bireylerde epilepsi, anksiyete, depresyon ve dikkat eksikliği/hiperaktivite bozukluğu \
                (DEHB) gibi durumlar daha sık görülebilir. Erken ve doğru destekle iletişim, sosyal beceriler ve \
                yaşam kalitesi belirgin şekilde iyileşebilir.</p>

                <h3>Kaynaklar</h3>
                <ul>
                <li><a href="https://www.who.int/news-room/fact-sheets/detail/autism-spectrum-disorders" \
                target="_blank" rel="noopener noreferrer">WHO — Autism spectrum disorders fact sheet</a></li>
                <li><a href="https://www.cdc.gov/mmwr/volumes/74/ss/ss7402a1.htm" target="_blank" \
                rel="noopener noreferrer">CDC MMWR — Prevalence and Early Identification of ASD (ADDM Network, \
                2022 verileri)</a></li>
                <li><a href="https://www.who.int/news/item/11-12-2025-who-expert-group-s-new-analysis-reaffirms-there-is-no-link-between-vaccines-and-autism" \
                target="_blank" rel="noopener noreferrer">WHO — Aşılar ve otizm arasında bağlantı olmadığını \
                doğrulayan uzman grup analizi (Aralık 2025)</a></li>
                </ul>
                """),
            article(editor, "Erken Belirtiler: Ne Zaman ve Nasıl Harekete Geçmeli?", "Sağlık", """
                <p>Otizmde erken fark etme ve erken destek, çocuğun gelişimi için büyük fark yaratır. ABD \
                CDC'nin "Learn the Signs. Act Early." (Belirtileri Öğren, Erken Harekete Geç) programı, ailelerin \
                2 aylıktan 5 yaşına kadar gelişimsel kilometre taşlarını takip etmesi için ücretsiz, araştırmaya \
                dayalı kaynaklar sunar.</p>

                <h3>Dikkat edilmesi gereken bazı işaretler</h3>
                <ul>
                <li>12 aylıkken adıyla seslenildiğinde tepki vermeme, jest/mimikle iletişim kurmama (el \
                sallamama, parmakla işaret etmeme)</li>
                <li>16 aylıkken hiç kelime söylememe</li>
                <li>24 aylıkken iki kelimeyi anlamlı şekilde bir araya getirememe (taklit veya tekrar dışında)</li>
                <li>Herhangi bir yaşta daha önce kazanılmış konuşma, babıldama veya sosyal becerilerin kaybı</li>
                <li>Göz teması kurmada süreklilik göstermeyen zorluk, akranlarına karşı sınırlı ilgi</li>
                </ul>
                <p>CDC bu tabloyu netleştirir: çocuğunuz bir veya daha fazla kilometre taşını karşılamıyorsa, daha \
                önce sahip olduğu becerileri kaybettiyse ya da içiniz rahat değilse, erken harekete geçilmesi \
                önerilir. Bu durumda ilk adım çocuk doktoruyla konuşmak ve gelişimsel tarama (screening) \
                istemektir.</p>

                <h3>Tarama ve tanı süreci</h3>
                <p>Amerikan Pediatri Akademisi (AAP), tüm çocuklara 18. ve 24. ayda otizme özgü standart tarama \
                testleri uygulanmasını önerir; ailenin endişesi olduğunda yaş sınırı gözetmeksizin değerlendirme \
                talep edilebilir. Tarama tek başına bir tanı koymaz; sadece daha ayrıntılı bir gelişimsel \
                değerlendirmeye ihtiyaç olup olmadığını gösterir. Tanı; çocuk psikiyatristi, gelişimsel pediatrist \
                veya çok disiplinli bir ekip tarafından davranış gözlemi ve aile görüşmesiyle konulur.</p>
                <p>Erken teşhis edilen çocuklar, erken yaşta yoğun ve bireyselleştirilmiş desteğe (özel eğitim, \
                konuşma terapisi, ergoterapi vb.) daha çabuk yönlendirilebilir; araştırmalar erken müdahalenin \
                bilişsel ve dil becerileri üzerinde olumlu etkisi olduğunu göstermektedir.</p>

                <h3>Kaynaklar</h3>
                <ul>
                <li><a href="https://www.cdc.gov/act-early/index.html" target="_blank" \
                rel="noopener noreferrer">CDC — Learn the Signs. Act Early.</a></li>
                <li><a href="https://www.cdc.gov/act-early/milestones/index.html" target="_blank" \
                rel="noopener noreferrer">CDC — Developmental Milestones</a></li>
                <li><a href="https://www.aafp.org/pubs/afp/issues/2020/1115/p629.html" target="_blank" \
                rel="noopener noreferrer">AAFP — Autism Spectrum Disorder: Updated Guidelines from the AAP \
                (2020)</a></li>
                </ul>
                """),
            article(editor, "Kanıta Dayalı Terapi Yöntemleri: ABA, Konuşma ve Ergoterapi", "Eğitim", """
                <p>Otizmde tek bir "doğru" tedavi yoktur; ihtiyaçlar kişiden kişiye değiştiği için destek planı da \
                bireyselleştirilmelidir. Yine de bazı yöntemlerin etkinliği çok sayıda bilimsel çalışmayla \
                desteklenmektedir.</p>

                <h3>Uygulamalı Davranış Analizi (ABA)</h3>
                <p>ABA, öğrenme kuramına dayanan ve istenen davranışları pekiştirirken zorlayıcı davranışları \
                azaltmayı hedefleyen yapılandırılmış bir yöntemdir. ABD Genel Cerrahı (US Surgeon General) ve \
                Amerikan Psikoloji Derneği tarafından otizmde kanıta dayalı "en iyi uygulama" olarak tanımlanır. \
                Yoğun ve erken uygulandığında bilişsel işlevler ve dil becerileri üzerinde olumlu etkileri \
                bilimsel literatürde raporlanmıştır.</p>

                <h3>Konuşma ve Dil Terapisi</h3>
                <p>İletişim, artikülasyon, dili anlama ve ifade etme becerilerine odaklanır. ABA ile birlikte \
                uygulandığında, ABA iletişimin temel yapı taşlarını sistematik olarak öğretirken konuşma terapisi \
                dilin özel yönlerini derinleştirir.</p>

                <h3>Ergoterapi (Duyu Bütünleme dahil)</h3>
                <p>Günlük yaşam becerileri, ince/kaba motor koordinasyon ve duyusal işlemleme güçlüklerine yönelik \
                çalışır. Birçok otistik çocuk için duyusal aşırı/az tepkiler günlük işlevselliği etkilediğinden \
                ergoterapi önemli bir tamamlayıcıdır.</p>

                <h3>Okul temelli destek</h3>
                <p>Amerikan Pediatri Akademisi'ne göre otizmli çocukların neredeyse tamamı okulda \
                bireyselleştirilmiş eğitim programı (Türkiye'de BEP) kapsamında ek desteğe ihtiyaç duyar; bu \
                genellikle eğitimsel müdahaleleri, konuşma terapisini ve ergoterapiyi bir arada içerir. En iyi \
                sonuçlar, farklı disiplinlerin çocuğun bireysel profiline göre koordineli çalıştığı çok yönlü \
                yaklaşımlarda elde edilir.</p>

                <h3>Kaynaklar</h3>
                <ul>
                <li><a href="https://www.ncbi.nlm.nih.gov/books/NBK619281/" target="_blank" \
                rel="noopener noreferrer">NCBI — Evidence Base for Applied Behavior Analysis</a></li>
                <li><a href="https://www.casproviders.org/asd-guidelines/" target="_blank" \
                rel="noopener noreferrer">Council of Autism Service Providers — ASD Guidelines</a></li>
                <li><a href="https://www.aafp.org/pubs/afp/issues/2020/1115/p629.html" target="_blank" \
                rel="noopener noreferrer">AAFP — Autism Spectrum Disorder: Updated Guidelines from the AAP \
                (2020)</a></li>
                </ul>
                """),
            article(editor, "Dikkat: Bilimsel Kanıtı Olmayan ve Zararlı Olabilecek \"Otizm Tedavileri\"", "Sağlık", """
                <p>Otizm "tedavi edilmesi gereken bir hastalık" değil, yaşam boyu süren nörogelişimsel bir \
                farklılıktır. Buna rağmen internette otizmi "iyileştirdiğini" iddia eden birçok kanıtsız ve bazen \
                tehlikeli ürün/yöntem pazarlanmaktadır. ABD Gıda ve İlaç Dairesi (FDA), 2019 yılında yayımladığı \
                tüketici uyarısında bu yöntemlerden bazılarını açıkça "aldatıcı, yanıltıcı ve potansiyel olarak \
                tehlikeli" olarak tanımlamıştır.</p>

                <h3>Kaçınılması gereken bazı yöntemler</h3>
                <ul>
                <li><strong>Şelasyon (chelation) tedavisi:</strong> Vücuttaki ağır metalleri bağlayıp atmayı \
                iddia eder; FDA'ya göre vücudun ihtiyaç duyduğu önemli mineralleri de bağlayarak dehidrasyon, \
                böbrek yetmezliği ve ölümle sonuçlanabilecek ciddi risk taşır.</li>
                <li><strong>MMS / Klor dioksit ("Mucize Mineral Solüsyonu"):</strong> Talimatlara göre \
                karıştırıldığında endüstriyel bir ağartıcıya dönüşür; kullanıcılarda bulantı, şiddetli kusma ve \
                hayatı tehdit eden tansiyon düşüklüğü bildirilmiştir.</li>
                <li><strong>Otizme özgü hiperbarik oksijen tedavisi:</strong> FDA tarafından dalış hastalığı gibi \
                belirli durumlar için onaylıdır, ancak otizm için onaylı veya kanıtlanmış değildir.</li>
                <li>Ham deve sütü, "detoks" iddiaları taşıyan uçucu yağ karışımları gibi kanıtsız "mucize" \
                ürünler.</li>
                </ul>
                <p>Bu tür yöntemler hem çocuğun sağlığını doğrudan riske atabilir hem de aileleri kanıta dayalı, \
                gerçekten fayda sağlayabilecek desteklerden (özel eğitim, konuşma terapisi, ergoterapi vb.) \
                uzaklaştırıp zaman ve kaynak kaybına yol açabilir.</p>

                <h3>Ailelere öneri</h3>
                <p>"Otizmi tamamen iyileştirir" ya da "kısa sürede kesin sonuç" vaat eden her yöntemden \
                şüphelenin. Yeni bir tedavi veya takviye denemeden önce mutlaka çocuğunuzun doktoruna danışın; \
                yöntemin bilimsel dayanağını, bağımsız ve yayımlanmış araştırmaların olup olmadığını sorgulayın.</p>
                <p><em>Not: FDA, Aralık 2025'te bu tüketici uyarısını kendi web sitesinden kaldırmıştır; ancak \
                aşağıda paylaşılan arşiv kopyasında ve bağımsız haber kaynaklarında belgelenen tıbbi riskler, \
                güncel tıbbi literatürle hâlâ geçerliliğini korumaktadır.</em></p>

                <h3>Kaynaklar</h3>
                <ul>
                <li><a href="https://www.autismsociety-nc.org/wp-content/uploads/Dangerous-Autism-Treatments-FDA.pdf" \
                target="_blank" rel="noopener noreferrer">FDA 2019 tüketici uyarısı (arşiv kopyası, Autism \
                Society of NC)</a></li>
                <li><a href="https://www.disabilityscoop.com/2026/01/20/fda-pulls-warning-about-potentially-dangerous-autism-therapies/31811/" \
                target="_blank" rel="noopener noreferrer">Disability Scoop — FDA Pulls Warning About \
                'Potentially Dangerous' Autism Therapies</a></li>
                <li><a href="https://www.who.int/news/item/11-12-2025-who-expert-group-s-new-analysis-reaffirms-there-is-no-link-between-vaccines-and-autism" \
                target="_blank" rel="noopener noreferrer">WHO — Aşılar ve otizm arasında bağlantı olmadığını \
                doğrulayan uzman grup analizi (Aralık 2025)</a></li>
                </ul>
                """),
            article(editor, "Meltdown (Duyusal Kriz) Anında Ne Yapılmalı?", "Davranış", """
                <p>"Meltdown", otistik bir bireyin duyusal, duygusal veya bilişsel aşırı yüklenme karşısında \
                yaşadığı, istemli olmayan ve kişinin baş etme kapasitesini aşan yoğun bir tepkidir. Bu bir \
                "huysuzluk" veya kasıtlı bir davranış değil, aşırı yüklenmeye verilen nörolojik bir tepkidir; bu \
                ayrımı anlamak, doğru şekilde destek olabilmek için kritik önem taşır.</p>

                <h3>Sık görülen tetikleyiciler</h3>
                <ul>
                <li>Duyusal aşırı yüklenme: parlak ışık, yüksek/ani sesler, kalabalık veya kaotik ortamlar</li>
                <li>Rutin değişiklikleri veya beklenmedik geçişler</li>
                <li>İhtiyaç ya da duyguyu ifade etmede yaşanan iletişim güçlüğü</li>
                </ul>

                <h3>Erken uyarı belirtileri</h3>
                <p>Meltdown genellikle aniden değil, artan huzursuzluk, kıpırdanma, sesin yükselmesi veya geri \
                çekilme gibi belirtilerle kademeli olarak gelişir. Bu erken işaretleri fark etmek, krizi tamamen \
                önlemek ya da şiddetini azaltmak için müdahale fırsatı sunar.</p>

                <h3>Kriz anında yapılabilecekler</h3>
                <ul>
                <li>Sakin ve yargılamayan bir tutum sergileyin; ses tonunuzu alçaltın</li>
                <li>Mümkünse aşırı uyaranı azaltın: ışığı kısın, sesi kısın, sakin bir alana yönlendirin</li>
                <li>Fazla konuşmayı ve talepte bulunmayı bırakın; basit, kısa yönergeler kullanın</li>
                <li>Kişinin güvenliğini sağlayın; kendine veya çevresine zarar verme riski varsa alanı güvenli \
                hale getirin</li>
                <li>Kriz geçtikten sonra, birey hazır olduğunda ne olduğunu birlikte konuşun; bu bir "ceza" anı \
                değildir</li>
                </ul>
                <p>Autism Speaks'in Zorlayıcı Davranışlar Araç Seti (Challenging Behaviors Tool Kit), pozitif \
                destek stratejileri, kriz anında yönetim ve uzun vadeli çözümler için ayrıntılı, ücretsiz bir \
                kaynak sunar.</p>

                <h3>Kaynaklar</h3>
                <ul>
                <li><a href="https://www.autismspeaks.org/tool-kit/challenging-behaviors-tool-kit" \
                target="_blank" rel="noopener noreferrer">Autism Speaks — Challenging Behaviors Tool Kit</a></li>
                <li><a href="https://www.cdc.gov/autism/about/index.html" target="_blank" \
                rel="noopener noreferrer">CDC — About Autism Spectrum Disorder</a></li>
                </ul>
                """),
            article(editor, "Ebeveyn Tükenmişliği: Kendinize de İyi Bakın", "Aile", """
                <p>Otizmli bir çocuğa bakım veren ebeveynlerin, nörotipik çocuğu olan ebeveynlere kıyasla \
                belirgin şekilde daha yüksek düzeyde stres, tükenmişlik ve zaman zaman depresyon yaşadığı, birçok \
                bilimsel çalışmada gösterilmiştir. Araştırmalar, otizmin kalıcılığı, toplumsal kabul eksikliği ve \
                yetersiz sosyal destek gibi etkenlerin ebeveynler için en yorucu faktörler arasında olduğunu \
                ortaya koymaktadır.</p>

                <h3>Tükenmişliğin belirtileri</h3>
                <ul>
                <li>Sürekli zihinsel ve fiziksel yorgunluk</li>
                <li>Sosyal çevreden uzaklaşma, yalnızlaşma</li>
                <li>Kendine zaman ayıramama, öz bakımı ihmal etme</li>
                <li>Gelecek kaygısı ve belirsizlikle baş etmede zorlanma</li>
                </ul>
                <p>Bu tablo bir "zayıflık" değil, uzun süreli ve yoğun bakım yükünün doğal bir sonucudur; fark \
                edilip ele alınması hem ebeveynin hem de çocuğun iyiliği için önemlidir.</p>

                <h3>Neler yardımcı olabilir?</h3>
                <ul>
                <li><strong>Molalar / geçici bakım (respite care):</strong> Araştırmalar, ihtiyaca uygun şekilde \
                planlandığında geçici bakım desteğinin ebeveyn stresini azaltabildiğini göstermektedir; ancak \
                yetersiz veya uygun olmayan destek tam tersi etki yaratabilir.</li>
                <li><strong>Akran destek grupları:</strong> Benzer deneyimi yaşayan diğer ebeveynlerle bağlantı \
                kurmak, yalnızlık hissini azaltabilir.</li>
                <li><strong>Profesyonel destek:</strong> Yoğun stres, tükenmişlik veya depresyon belirtileri \
                sürdüğünde bir ruh sağlığı uzmanından destek almak önemlidir.</li>
                <li><strong>Küçük, gerçekçi öz bakım alışkanlıkları:</strong> Uyku, beslenme ve kısa süreli de \
                olsa kendinize ayırdığınız zaman, uzun vadede sürdürülebilir bakım için gereklidir.</li>
                </ul>
                <p>Kendinize iyi bakmak bencillik değildir — sürdürülebilir ve sabırlı bir bakım verebilmenin ön \
                koşuludur.</p>

                <h3>Kaynaklar</h3>
                <ul>
                <li><a href="https://journals.sagepub.com/doi/10.1177/10664807251403519" target="_blank" \
                rel="noopener noreferrer">SAGE Journals — Caregiver Burnout: Experiences of Caregivers of Adults \
                with ASD</a></li>
                <li><a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12900424/" target="_blank" \
                rel="noopener noreferrer">PMC — Effects of Respite Care on Caregiver Quality of Life \
                (Systematic Review)</a></li>
                </ul>
                """),
            article(editor, "Türkiye'de Eğitim Hakları: RAM, BEP ve Kaynaştırma Eğitimi", "Eğitim", """
                <p>Türkiye'de özel eğitime ihtiyaç duyan çocukların (otizmli çocuklar dahil) eğitim hakları, \
                Millî Eğitim Bakanlığı (MEB) Özel Eğitim Hizmetleri Yönetmeliği ve 2024'te güncellenen Özel \
                Eğitim Kurumları Yönetmeliği ile düzenlenir.</p>

                <h3>RAM (Rehberlik ve Araştırma Merkezi) süreci</h3>
                <p>Çocuğunuzda gelişimsel bir farklılık fark ettiğinizde, bulunduğunuz ildeki RAM'a başvurarak \
                değerlendirme talep edebilirsiniz. RAM bünyesindeki özel eğitim değerlendirme kurulu, çocuğun \
                eğitsel ihtiyaçlarını belirler ve bir eğitim planı önerisiyle rapor hazırlar. Bu rapor; \
                kaynaştırma eğitimi, destek eğitim odası ya da özel eğitim kurumu gibi en uygun eğitim ortamının \
                belirlenmesinde temel dayanaktır.</p>

                <h3>BEP (Bireyselleştirilmiş Eğitim Programı)</h3>
                <p>BEP, çocuğun güçlü ve gelişime açık yönlerine göre okulda hazırlanan, kişiye özel hedefler \
                içeren bir eğitim planıdır. Okuldaki BEP geliştirme birimi; aile, öğretmenler ve gerektiğinde RAM \
                iş birliğiyle bu planı hazırlar ve düzenli olarak gözden geçirir. Ebeveynler BEP hazırlama \
                sürecine katılma ve çocuklarının hedefleri hakkında bilgi alma hakkına sahiptir.</p>

                <h3>Kaynaştırma eğitimi ve destek eğitim odaları</h3>
                <p>Kaynaştırma eğitimi, özel eğitime ihtiyacı olan öğrencilerin akranlarıyla aynı sınıfta (tam \
                zamanlı) ya da kısmi olarak özel eğitim sınıflarında eğitim görmesini, gerektiğinde ek destek \
                hizmetler almasını ifade eder. Tam zamanlı kaynaştırma uygulanan okullarda, öğrencinin ihtiyacına \
                göre destek eğitim odaları açılabilir; RAM'lar, kaynaştırma uygulanan okulların ve destek eğitim \
                odalarının ihtiyaçlarını belirleyip il/ilçe millî eğitim müdürlüklerine bildirimde bulunur.</p>

                <h3>Ebeveyn olarak haklarınız</h3>
                <ul>
                <li>Çocuğunuz için RAM değerlendirmesi talep etme</li>
                <li>BEP hazırlama sürecine dahil olma ve plan hakkında bilgi alma</li>
                <li>Önerilen eğitim ortamına itiraz etme ve yeniden değerlendirme talep etme</li>
                </ul>
                <p>Yönetmelik metinleri zaman zaman güncellenebildiğinden, ilinizdeki RAM veya okulunuzun \
                rehberlik servisiyle güncel uygulamaları teyit etmeniz önerilir.</p>

                <h3>Kaynaklar</h3>
                <ul>
                <li><a href="https://orgm.meb.gov.tr/meb_iys_dosyalar/2021_09/13145613_Ozel_EYitim_Hizmetleri_YonetmeliYi_son.pdf" \
                target="_blank" rel="noopener noreferrer">MEB — Özel Eğitim Hizmetleri Yönetmeliği</a></li>
                <li><a href="https://ookgm.meb.gov.tr/meb_iys_dosyalar/2024_06/24175722_ozelegitimkurumlariyonetmeligi.pdf" \
                target="_blank" rel="noopener noreferrer">MEB — Özel Eğitim Kurumları Yönetmeliği (2024 \
                güncellemesi)</a></li>
                </ul>
                """)
        );

        knowledgeArticleRepository.saveAll(articles);
        log.info("{} Bilgi Bankası makalesi eklendi.", articles.size());
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

    private KnowledgeArticle article(User author, String title, String category, String content) {
        return KnowledgeArticle.builder()
                .title(title)
                .content(content)
                .category(category)
                .author(author)
                .published(true)
                .format("TEXT")
                .build();
    }
}
