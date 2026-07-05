# Otizm Platformu Geliştirme Planı

## Giriş

Bu doküman, Otizm Platformu'nun mevcut kod tabanı incelenerek hazırlanmış güncel geliştirme planını içerir. Amaç, hangi özelliklerin üretime hazır olduğunu netleştirmek ve kalan işleri önceliklendirilmiş fazlara ayırarak yol haritasını ortaya koymaktır.

## Mevcut Durum Analizi

Backend tarafında 55 controller ve 63 servis sınıfı, frontend tarafında ise bunlara karşılık gelen servis katmanlarıyla birlikte platformun büyük bölümü uçtan uca çalışır durumdadır.

| Modül | Durum | Açıklama |
|---|---|---|
| Randevu ve uzman takvimi | Tamamlandı | Uzman müsaitliği, slot yönetimi ve onay akışı çalışıyor |
| Gerçek zamanlı bildirimler | Tamamlandı | WebSocket (STOMP/SockJS) üzerinden anlık bildirim, polling yalnızca yedek mekanizma olarak kaldı |
| Push bildirimleri | Tamamlandı | Web push altyapısı VAPID anahtarlarıyla yapılandırılmış, cihaz token yönetimi mevcut |
| PWA desteği | Tamamlandı | Service worker, önbellekleme stratejileri ve ana ekrana ekleme desteği aktif |
| Admin paneli | Tamamlandı | Kullanıcı, uzman onayı, raporlama ve denetim kaydı yönetimi rol bazlı yetkilendirmeyle çalışıyor |
| Grup sohbeti | Tamamlandı | Topluluk grupları için gerçek zamanlı mesajlaşma mevcut |
| Haftalık tartışma konusu | Tamamlandı | Tekil cevap kısıtı ve panoda öne çıkarma ile birlikte devrede |
| İlerleme takibi ve analiz | Tamamlandı | Zaman serisi bazlı gelişim grafikleri ve korelasyon analizleri mevcut |
| Klinik ve günlük takip modülleri | Tamamlandı | İlaç, uyku, duygu durumu, beslenme, tarama, okul günlüğü, acil durum kartı gibi modüllerin tamamı bağlı |
| Yapay zeka destekli özellikler | Tamamlandı | Chatbot ve içgörü üretimi gerçek dil modeli entegrasyonuyla çalışıyor |
| Benzer aileler ve buluşma isteği | Tamamlandı | Durum takipli buluşma isteği akışı (öneri, kabul, ret) kuruldu; kullanılmayan görüntülü görüşme iskeleti kaldırıldı |
| Gelişmiş arama | Kısmen tamamlandı | Tür ve kategori filtreleri arayüze taşındı; etiket filtresi backend'de henüz hiç uygulanmamış |
| Çoklu dil desteği | Başlanmadı | Uygulama şu an yalnızca Türkçe içerik ve arayüz sunuyor |

Genel tabloya bakıldığında ürün, olgunluk açısından ilk bakışta görünenden çok daha ileri bir noktada. Kalan çalışma, birkaç noktasal eksiği tamamlamak ve ardından sistemi yayın öncesi sağlamlaştırmaktan ibaret.

## Faz 1: Kalan Fonksiyonel Eksikler

**Arama filtrelerinin tamamlanması — Tamamlandı.** Arama servisine tür ve kategori parametreleri eklendi; komut paletindeki hızlı aramaya bu filtreler için arayüz kontrolleri kondu. Etiket filtresi, backend tarafında da hiç uygulanmadığı için ayrı ve daha büyük bir iş kalemi olarak Faz 4'e bırakılmıştır.

**Benzer aileler için buluşma isteği — Tamamlandı.** Kullanılmayan, arayüze hiç bağlanmamış görüntülü görüşme altyapısı (backend'de var olup DB tarafında karşılığı bile bulunmayan ölü kod) kaldırıldı. Yerine, durum takibi yapılan gerçek bir buluşma isteği akışı kuruldu: istek gönderme, kabul/ret ve bildirim üretimi uçtan uca çalışıyor.

**Çoklu dil altyapısının kurulması — Kalan iş.** Bu aşamada hedef, tüm metinleri çevirmek değil, yeni geliştirilecek sayfaların baştan çok dilli yapıya uygun yazılmasını sağlayacak temel altyapıyı kurmaktır. Mevcut sayfaların çevirisi ilerleyen fazlara bırakılabilir.

## Faz 2: Sağlamlaştırma ve Kalite

Kod tabanının büyüklüğü göz önüne alındığında, yayın öncesinde aşağıdaki başlıkların gözden geçirilmesi gerekiyor:

- Mevcut test kapsamının ölçülmesi ve kritik akışlar (kimlik doğrulama, uzman onayı, admin işlemleri) için entegrasyon testlerinin tamamlanması.
- Güvenlik incelemesi; özellikle yetkilendirme kontrolleri, dosya yükleme akışı ve oturum/token yönetimi.
- Hata yönetimi ve loglama altyapısının merkezi ve tutarlı hale getirilmesi.
- Performans taraması; özellikle gerçek zamanlı bağlantı ölçeklenebilirliği ve analiz sorgularının verimliliği.

Bu faz, yayına çıkmadan önce tamamlanması gereken bir ön koşul niteliğindedir.

## Faz 3: Yayına Hazırlık

Sağlamlaştırma tamamlandıktan sonra operasyonel hazırlık adımları devreye girer:

- Dağıtım (CI/CD) sürecinin kurulması veya mevcutsa gözden geçirilmesi.
- Test ortamı ile üretim ortamı arasındaki yapılandırma farklarının giderilmesi.
- Veritabanı yedekleme ve geri yükleme prosedürlerinin tanımlanması.
- Gerçek kullanıcı yüküne yakın senaryolarla yük testi yapılması.
- Olası bir sorun durumunda geri alma (rollback) planının hazırlanması.

## Faz 4: Büyüme ve Genişleme

Ürün stabil hale geldikten sonra ele alınabilecek geliştirmeler:

- Çoklu dil desteğinin tam kapsamlı hale getirilmesi ve dil seçim arayüzünün eklenmesi.
- Etiket bazlı arama filtresinin backend'de gerçek anlamda uygulanması.
- Bilgi bankasına video ve podcast gibi yeni içerik türlerinin eklenmesi.
- Arama ve keşif deneyiminin öneri mekanizmalarıyla zenginleştirilmesi.

## Önceliklendirme Gerekçesi

Fazların sıralaması, önce kullanıcının doğrudan fark edeceği ve düşük riskli eksiklerin kapatılması, ardından mevcut geniş kod tabanının güvenlik ve kalite açısından gözden geçirilmesi, sonrasında yayın operasyonlarının hazırlanması ve son olarak büyüme yatırımlarının yapılması mantığına dayanmaktadır. Sağlamlaştırma adımı atlanarak doğrudan yayına geçilmesi, üretimde beklenmedik hatalara yol açma riski taşımaktadır.

## Riskler

- Test kapsamı netleştirilmeden yayın hazırlığı fazına geçilmesi, üretimde geri dönüşlere neden olabilir.
- Yeni eklenen buluşma isteği tablosu için üretim veritabanında migration'ın (V37) kontrollü şekilde uygulanması gerekir.
