<div align="center">
  <img src="frontend/public/og-image.png" alt="Otizm Destek Platformu" width="760" />

  # Otizm Destek Platformu

  **Aileleri ve uzmanları; gelişim takibi, iletişim ve günlük destek araçlarıyla aynı güvenli platformda buluşturur.**

  [![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=111)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Spring Boot](https://img.shields.io/badge/Spring_Boot_3-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
  [![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
</div>

## Proje hakkında

Otizm Destek Platformu; otizmli çocukların ebeveynleri, uzmanlar ve platform yöneticileri için geliştirilen kapsamlı bir web uygulamasıdır. Çocuğun günlük yaşamına ait kayıtları, klinik gelişim göstergelerini, uzman görüşmelerini ve topluluk desteğini tek bir merkezde toplar.

> Bu yazılım tıbbi tanı veya tedavinin yerini almaz. Klinik kararlar için yetkili sağlık profesyonellerine başvurulmalıdır.

## Öne çıkan özellikler

- **Gelişim paneli:** Ruh hâli, uyku, kilometre taşları ve tarama sonuçlarını grafiklerle izleme
- **Günlük takip:** Rutin, ilaç, beslenme, okul günlüğü ve duyusal profil kayıtları
- **Uzman çalışma alanı:** Danışan yönetimi, randevu, görev, özel not ve BEP raporu akışları
- **AI analizleri:** Kullanıcı rızasına bağlı Gemini özetleri ve ABC davranış örüntüsü analizi
- **Güvenli iletişim:** Aile–uzman mesajlaşması, bildirimler ve gerçek zamanlı WebSocket desteği
- **Topluluk:** Forum, gruplar, benzer aile eşleştirmesi, buluşmalar ve destek duvarı
- **Zor an araçları:** Kriz rehberi, sosyal öyküler ve paylaşılabilir acil durum kartı
- **Gizlilik altyapısı:** KVKK rıza kayıtları, veri sahibi başvuruları, saklama süreleri ve denetim izleri

## Teknoloji yığını

| Katman | Teknolojiler |
| --- | --- |
| Web arayüzü | React 19, TypeScript, Vite, Tailwind CSS 4 |
| İstemci durumu | TanStack Query, Zustand, React Hook Form, Zod |
| Backend | Java 21, Spring Boot 3.3, Spring Security, WebSocket |
| Veri | PostgreSQL 16, Redis, Flyway, JPA |
| Dosya ve bildirim | S3 uyumlu depolama, Firebase, Web Push, SMTP |
| Test | Vitest, Playwright, Spring Boot Test, Testcontainers |
| Dağıtım | Docker Compose, Nginx, Vercel/Render yapılandırmaları |

## Mimari

```text
otizm-destek-platformu/
├── frontend/                  # React + TypeScript istemcisi
│   ├── src/pages/             # Kullanıcı ve uzman ekranları
│   ├── src/components/        # Yeniden kullanılabilir bileşenler
│   └── src/services/          # API istemcileri
├── backend/                   # Spring Boot API
│   └── src/main/
│       ├── java/              # Controller, service ve domain katmanları
│       └── resources/         # Ayarlar ve Flyway migrasyonları
├── docker-compose.yml         # Yerel geliştirme servisleri
└── docker-compose.prod.yml    # Üretim ortamı servisleri
```

## Docker ile hızlı başlangıç

### Gereksinimler

- Docker ve Docker Compose
- Git

```bash
git clone https://github.com/EnesKotay/otizm-destek-platformu.git
cd otizm-destek-platformu
docker compose up -d --build
```

Docker Compose yerel geliştirme için varsayılan değerlerle çalışır. AI, gerçek e-posta ve bildirim özellikleri için `.env.example` dosyasını `.env` adıyla kopyalayıp ilgili değerleri doldurun. Uygulama varsayılan olarak `http://localhost:5173` adresinde açılır.

Servisleri durdurmak için:

```bash
docker compose down
```

## Yerel geliştirme

Önce veri servislerini başlatın:

```bash
docker compose up -d postgres redis
```

Backend:

```bash
cd backend
./mvnw spring-boot:run
```

Frontend:

```bash
cd frontend
npm ci
cp .env.example .env
npm run dev
```

## Test ve kalite kontrolleri

```bash
# Frontend
cd frontend
npm run lint
npm test
npm run test:e2e

# Backend
cd ../backend
./mvnw test
```

## Ortam değişkenleri

Tüm üretim ayarları kökteki [`.env.example`](.env.example) dosyasında açıklanır. Başlıca gruplar:

- PostgreSQL ve Redis bağlantıları
- JWT ve şifreleme anahtarları
- İzin verilen frontend/CORS adresleri
- SMTP, Web Push ve Firebase bildirimleri
- S3 uyumlu özel dosya depolama
- Gemini API anahtarı ve KVKK saklama süreleri

Gerçek anahtarları veya kullanıcı verilerini Git geçmişine eklemeyin.

## Veritabanı

Flyway migrasyonları backend açılırken şemayı otomatik olarak oluşturur ve günceller. Geliştirme amaçlı örnek veri için kökteki `seed.sql` dosyası kullanılabilir. Üretim verisini içe aktarmadan önce yedek alın ve hedef veritabanını doğrulayın.

## API dokümantasyonu

Backend çalışırken OpenAPI arayüzüne şu adresten ulaşabilirsiniz:

```text
http://localhost:8080/swagger-ui/index.html
```

## Gizlilik ve güvenlik

Platform hassas çocuk ve sağlık verileri işleyebilir. Üretim ortamında güçlü ve benzersiz anahtarlar kullanın; TLS, erişim kontrolü, şifreli yedekleme ve KVKK süreçlerini devreye almadan gerçek kullanıcı verisi işlemeyin. AI analizleri yalnızca ilgili veli rızası bulunduğunda etkinleştirilmelidir.

---

<div align="center">Ailelerin takibini kolaylaştırmak, uzmanlarla iletişimi güçlendirmek ve desteği erişilebilir kılmak için.</div>
