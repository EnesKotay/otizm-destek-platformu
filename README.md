# Otizm Destek Platformu 🧩

Otizmli çocukların ebeveynlerini, uzmanları (terapist/doktor) ve platform yöneticilerini tek bir çatı altında buluşturan web tabanlı gelişim takip ve destek platformudur.

---

## 🚀 Öne Çıkan Özellikler

- 📊 **Nasıl İlerliyoruz? (Gelişim Paneli):** Çocukların ruh hali, uyku düzeni, klinik tarama skorları ve kilometre taşlarının görsel grafikleri.
- 🤖 **Yapay Zeka Analisti:** Gemini AI entegrasyonu ile gelişim verilerinin akıllı özeti ve ABC davranış örüntüsü analizleri.
- 🗓️ **Günlük Takip & Rutinler:** Uyku, duydu durumu, ilaç kullanımı ve görsel günlük rutin çizelgeleri.
- 👨‍⚕️ **Uzman & Danışan Yönetimi:** Randevu planlama, BEP (Bireyselleştirilmiş Eğitim Planı) raporu oluşturma ve hasta takibi.
- 💬 **Mesajlaşma & Topluluk:** Aile-uzman arası güvenli mesajlaşma, forum, yerel buluşmalar ve dertleşme duvarı.
- 🆘 **Zor An Rehberi & Acil Durum Kartı:** Kriz anlarında sakinleşme adımları ve acil durumlarda paylaşılabilir çocuk profili.

---

## 🛠️ Teknoloji Yığını

### Frontend
- **Framework:** React 18 + TypeScript + Vite
- **Stil:** Tailwind CSS + Lucide React İkonları
- **State & Query:** Zustand + TanStack React Query (v5)
- **Grafikler:** Recharts

### Backend
- **Framework:** Java 21 + Spring Boot 3.2
- **Veritabanı:** PostgreSQL 16 + Redis (Önbellek & Oturum)
- **Migrasyon:** Flyway
- **Güvenlik:** JWT + Spring Security

---

## 🛠️ Kurulum ve Çalıştırma

### 1. Docker ile Hızlı Başlatma (Önerilen)

Tüm servisleri (PostgreSQL, Redis, Backend, Frontend) tek komutla başlatmak için:

```bash
docker-compose up -d
```

### 2. Yerel Geliştirme (Local Development)

#### Veritabanı ve Redis
```bash
docker-compose up -d postgres redis
```

#### Backend (Java 21 / Spring Boot)
```bash
cd backend
./mvnw spring-boot:run
```

#### Frontend (React / Vite)
```bash
cd frontend
npm install
npm run dev
```

Platform varsayılan olarak `http://localhost:5173` adresinde çalışacaktır.

---

## 🗄️ Veritabanı Kurulumu ve İçe Aktarma

Projede **Flyway** entegre edilmiştir. Backend çalıştırıldığında veritabanı şeması otomatik kurulur (`backend/src/main/resources/db/migration`).

Eğer var olan güncel döküm verilerini içeri aktarmak isterseniz:

```bash
# Docker ortamına aktarma:
docker exec -i autism-platform-db psql -U postgres -d autism < guncel_veritabani.sql

# Yerel PostgreSQL'e aktarma:
psql -U postgres -d autism < guncel_veritabani.sql
```

---

## 📂 Proje Dizin Yapısı

```
Otizm/
├── backend/                   # Spring Boot 3 Backend
│   ├── src/main/java/         # Java kaynak kodları
│   └── src/main/resources/    # db/migration (Flyway SQL dosyaları)
├── frontend/                  # React + TypeScript Frontend
│   └── src/
│       ├── components/        # Yeniden kullanılabilir UI bileşenleri
│       ├── pages/             # Uygulama sayfaları
│       ├── services/          # API istemcileri
│       └── store/             # Zustand state depoları
├── docker-compose.yml         # Geliştirme ortamı Docker konfigürasyonu
├── guncel_veritabani.sql      # Güncel PostgreSQL veritabanı dökümü
├── seed.sql                   # Başlangıç test verileri
└── README.md                  # Proje dokümantasyonu
```
