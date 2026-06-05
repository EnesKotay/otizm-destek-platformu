package com.autismsupport.platform.config;

import com.autismsupport.platform.model.Tag;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.model.UserRole;
import com.autismsupport.platform.repository.TagRepository;
import com.autismsupport.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final TagRepository tagRepository;
    private final UserRepository userRepository;
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
}
