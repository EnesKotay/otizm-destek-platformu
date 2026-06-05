# Feature Prioritization

Bu not, mevcut kod tabanına bakılarak hazırlanmış teknik önceliklendirme özetidir.

## Genel Durum

- Frontend tarafında sayfa ve servis kontratları büyük ölçüde hazır.
- Backend çalışma alanında çok sayıda controller/service/model dosyası silinmiş görünüyor; bu nedenle bazı akışlar UI seviyesinde tanımlı olsa da çalışan sunucu tarafı şu an eksik olabilir.
- En yüksek değer üreten ilk iş, mevcut veri akışlarını gerçekten çalışan backend ve gerçek zamanlı katmanla tamamlamak.

## Özellik Bazlı Değerlendirme

### 1. Randevu ve terapi takibi

Durum:
- Takvim CRUD ekranı var.
- Çocuk bazlı etkinlikler tutuluyor.
- Uzman müsaitliği, slot yönetimi, randevu talebi, onay/red akışı yok.

Kanıt:
- `frontend/src/pages/CalendarPage.tsx`
- `frontend/src/services/calendarService.ts`
- `frontend/src/pages/ExpertsPage.tsx`

Öncelik:
- Yüksek

Not:
- Bu iş için `expert_availability`, `appointments`, `appointment_status_history` benzeri modeller gerekir.

### 3. Haftalık / günlük tartışma konusu

Durum:
- Forum sayfası güçlü bir içerik yapısına sahip.
- Dashboard içinde featured topic widget yok.
- Forum tarafında haftanın konusu banner akışı yok.

Kanıt:
- `frontend/src/pages/ForumPage.tsx`
- `frontend/src/pages/DashboardPage.tsx`

Öncelik:
- Orta

Not:
- İçerik ve moderasyon akışı netleşince hızlı teslim edilebilecek bir özellik.

### 4. İlerleme takibi görselleri

Durum:
- Çocuk detay ekranında sadece kategori bazlı bar chart var.
- Zaman serisi çizgi grafik, aylık karşılaştırma, trend analizi yok.

Kanıt:
- `frontend/src/pages/ChildDetailPage.tsx`
- `frontend/src/pages/NotesPage.tsx`
- `frontend/src/services/milestoneService.ts`

Öncelik:
- Yüksek

Not:
- Ürün değeri yüksek ve mevcut note/milestone verisi üzerine inşa edilebilir.

### 5. Bildirim sistemi gerçek zamanlı değil

Durum:
- WebSocket hook mevcut.
- Bildirim zilinde gerçek zamanlı abonelik yok; 30 saniyede bir polling yapılıyor.
- Push notification akışı yok.

Kanıt:
- `frontend/src/hooks/useWebSocket.ts`
- `frontend/src/components/notifications/NotificationBell.tsx`
- `frontend/src/services/notificationService.ts`

Öncelik:
- Çok yüksek

Not:
- Mesajlar, yorumlar ve forum etkileşimleri için platform hissini en hızlı iyileştiren işlerden biri.

### 6. Grup sohbetleri aktif değil

Durum:
- Grup keşfetme/katılma/ayrılma arayüzü var.
- Grup içi canlı sohbet ekranı yok.
- Tip seviyesinde `Conversation.type = GROUP` desteği düşünülmüş ama UI akışı tamamlanmamış.

Kanıt:
- `frontend/src/pages/GroupsPage.tsx`
- `frontend/src/types/index.ts`
- `frontend/src/pages/MessagesPage.tsx`

Öncelik:
- Yüksek

Not:
- Mevcut mesajlaşma altyapısı genişletilerek yapılabilir; sıfırdan başlamak gerekmiyor.

### 7. Benzer aileler -> buluşma

Durum:
- Matching ekranı ve filtreler var.
- Kullanıcı yalnızca direkt mesaj başlatabiliyor.
- Görüntülü/sesli görüşme ve offline buluşma organizasyonu yok.

Kanıt:
- `frontend/src/pages/SimilarFamiliesPage.tsx`
- `frontend/src/services/matchingService.ts`

Öncelik:
- Orta

Not:
- İlk iterasyonda “buluşma isteği” ve “takvim daveti” eklemek, tam video çağrıdan daha düşük riskli olur.

### 8. Ebeveyn hikayeleri / podcast

Durum:
- Bilgi Bankası metin tabanlı makaleler içeriyor.
- Video, ses serisi, röportaj veya bölüm modeli yok.

Kanıt:
- `frontend/src/pages/KnowledgePage.tsx`
- `frontend/src/services/knowledgeService.ts`
- `frontend/src/types/index.ts`

Öncelik:
- Orta

Not:
- Yeni bir içerik tipi ailesi gerekir: `article`, `story`, `podcast`, `video`.

### 9. Mobil uygulama / PWA tam aktif değil

Durum:
- `manifest.json` ve temel `sw.js` dosyası var.
- Service worker kayıt akışı yok.
- Offline cache çok sınırlı.
- A2HS ve push notification akışları yok.

Kanıt:
- `frontend/public/manifest.json`
- `frontend/public/sw.js`
- `frontend/src/main.tsx`

Öncelik:
- Çok yüksek

Not:
- Bu madde, bildirim sistemiyle birlikte ele alınmalı.

### 10. Arama daha akıllı olabilir

Durum:
- Global arama mevcut.
- Sadece içerik tipi filtresi var.
- Tarih, kategori, yazar, etiket kombinasyonları yok.

Kanıt:
- `frontend/src/pages/SearchPage.tsx`
- `frontend/src/services/searchService.ts`

Öncelik:
- Orta

Not:
- UI kolay; asıl değer backend sorgu tasarımı ve indekslemede.

### 11. Admin paneli hiç yok

Durum:
- `ADMIN` rolü tiplerde var.
- Uygulama rotalarında ayrı admin alanı yok.
- Uzman onayı, rapor moderasyonu, istatistik paneli görünmüyor.

Kanıt:
- `frontend/src/types/index.ts`
- `frontend/src/App.tsx`
- `frontend/src/pages/ExpertRegisterPage.tsx`

Öncelik:
- Çok yüksek

Not:
- Uzman başvurusu, içerik raporlama ve featured topic yönetimi için temel bağımlılık.

### 12. Çok dil desteği

Durum:
- Uygulama metinleri sabit Türkçe.
- Sadece tarih formatlama için Türkçe locale kullanılıyor.
- Çift sütunlu TR/EN içerik yapısı yok.

Kanıt:
- `frontend/src/utils/date.ts`
- `frontend/src/pages/KnowledgePage.tsx`

Öncelik:
- Orta

Not:
- Bu iş, tam i18n ile “makale çeviri görünümü”nü ayrı kararlar olarak ele alınmalı.

## Önerilen Uygulama Sırası

1. Admin paneli
2. Gerçek zamanlı bildirim sistemi
3. PWA aktivasyonu ve web push
4. Grup sohbetleri
5. Randevu ve uzman müsaitlik sistemi
6. İlerleme grafikleri ve aylık analiz
7. Gelişmiş arama
8. Featured topic
9. Benzer aileler için buluşma akışı
10. Hikaye / podcast içerik modeli
11. Çok dil desteği

## Neden Bu Sıra

- `Admin paneli`, moderasyon ve uzman onayı gibi operasyonel işleri açar.
- `Gerçek zamanlı bildirim + PWA`, günlük kullanım hissini en hızlı artırır.
- `Grup sohbeti + randevu`, topluluk ve uzman etkileşimini derinleştirir.
- `İlerleme grafikleri`, aile için doğrudan görülen ürün değerini yükseltir.
- `Arama / featured topic / içerik tipleri`, büyüme ve keşif deneyimini iyileştirir.

## Teknik Risk

- Backend tarafında çok sayıda silinmiş dosya olduğu için, yeni özellik eklemeden önce mevcut API yüzeyinin geri yüklenmesi ya da yeniden kurulması gerekebilir.
- Özellikle WebSocket, bildirim, arama ve randevu işleri backend olmadan gerçek anlamda tamamlanamaz.
