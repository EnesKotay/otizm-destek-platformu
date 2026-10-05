#!/usr/bin/env python3
"""Staj defteri PDF'sine doğrulanabilir öğrenci ve çalışma bilgilerini işler."""

from __future__ import annotations

import argparse
import io
from datetime import date
from pathlib import Path

from PyPDF2 import PdfReader, PdfWriter
from reportlab.lib.colors import black, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


PAGE_WIDTH = 595
PAGE_HEIGHT = 842
FONT_REGULAR = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"


WORK_DAYS = [
    date(2026, 6, 29), date(2026, 6, 30),
    date(2026, 7, 1), date(2026, 7, 2), date(2026, 7, 3),
    date(2026, 7, 6), date(2026, 7, 7), date(2026, 7, 8), date(2026, 7, 9), date(2026, 7, 10),
    date(2026, 7, 13), date(2026, 7, 14), date(2026, 7, 16), date(2026, 7, 17),
    date(2026, 7, 20), date(2026, 7, 21), date(2026, 7, 22), date(2026, 7, 23), date(2026, 7, 24),
    date(2026, 7, 27), date(2026, 7, 28), date(2026, 7, 29), date(2026, 7, 30), date(2026, 7, 31),
]

DAY_NAMES = {
    0: "Pazartesi", 1: "Salı", 2: "Çarşamba", 3: "Perşembe",
    4: "Cuma", 5: "Cumartesi", 6: "Pazar",
}

SUMMARY = [
    "Gereksinim analizi ve proje kapsamının belirlenmesi",
    "Geliştirme ortamı ile servislerin kurulması",
    "Sistem mimarisi, roller ve veri modelinin incelenmesi",
    "Topluluk ve bildirim modüllerinin tasarlanması",
    "Topluluk, haftalık soru ve anlık bildirim geliştirmeleri",
    "Bilgi bankası aktarımı ve CI/CD altyapısının kurulması",
    "Test senaryoları ve veritabanı geçiş planının hazırlanması",
    "Flyway, Redis, öğretmen rolü, eşleştirme ve PWA çalışmaları",
    "FCM, bilgi bankası, yedekleme ve yönetim paneli geliştirmeleri",
    "Entegrasyon testleri, hata giderme ve kod iyileştirmeleri",
    "Gelişmiş arama, RAG, MFA ve KVKK gereksinim analizi",
    "Hassas veriler, dosya güvenliği ve hesap yaşam döngüsü tasarımı",
    "Arama ve güvenlik servislerinin backend geliştirmeleri",
    "Kimlik doğrulama, PWA ve erişilebilirlik arayüz çalışmaları",
    "Güvenlik, arama ve kullanıcı akışlarının bütünleşik testi",
    "Flyway/JPA düzeltmeleri, egzersiz sihirbazı ve erişilebilirlik",
    "Gelişim paneli düzeltmeleri, veritabanı dökümü ve dokümantasyon",
    "Yönetim paneli, konsültasyon ve bildirim arayüzlerinin geliştirilmesi",
    "Platform deneyimi, veri modeli ve içerik erişim kontrolü",
    "KVKK rıza, veri sahibi başvurusu ve saklama-imha süreçleri",
    "E-posta bildirimlerinin test edilmesi ve hata dayanıklılığı",
    "Uçtan uca testler, erişilebilirlik ve regresyon kontrolleri",
    "Performans, yedekleme/geri yükleme ve dağıtım kontrolleri",
    "Son kabul testleri, güvenlik kontrolü ve teknik raporlama",
]

DETAILS = [
    (
        "Proje Gereksinimlerinin Analizi",
        "Stajın ilk gününde geliştirilecek Otizm Destek Platformu'nun amacı ve hedef kullanıcıları incelendi. Ebeveyn, uzman ve yönetici rollerinin ihtiyaçları; gelişim takibi, randevu, bilgi bankası, mesajlaşma ve topluluk özellikleri açısından değerlendirildi.",
        "İşlevsel gereksinimler ile güvenlik, erişilebilirlik ve performans gibi işlevsel olmayan gereksinimler ayrı başlıklar altında toplandı. Çalışmaların React/TypeScript frontend, Spring Boot backend, PostgreSQL ve Redis bileşenleri üzerinden yürütülmesine karar verildi.",
        "Günün sonunda modüller önceliklendirilerek staj süresince izlenecek geliştirme ve test planı oluşturuldu.",
    ),
    (
        "Geliştirme Ortamının Kurulması",
        "Kaynak kod deposu ve proje dizin yapısı incelendi. Java 21, Spring Boot, Node.js, React, PostgreSQL ve Redis bağımlılıkları doğrulandı; Docker Compose ile yerel geliştirme servisleri ayağa kaldırıldı.",
        "Backend ve frontend uygulamaları ayrı ayrı çalıştırılarak bağlantı ayarları, ortam değişkenleri ve veritabanı erişimi kontrol edildi. Flyway geçişlerinin başlangıç sırası ve örnek veri yükleme süreci gözlemlendi.",
        "Kurulum adımları not edildi ve sonraki geliştirmelerde tekrarlanabilir bir çalışma ortamı elde edildi.",
    ),
    (
        "Sistem Mimarisi ve Veri Modeli",
        "Uygulamanın katmanlı backend yapısı; controller, service, repository, DTO ve entity sınıfları üzerinden incelendi. Frontend tarafında sayfa, bileşen, servis, durum yönetimi ve yönlendirme yapıları değerlendirildi.",
        "Kullanıcı rolleri ile çocuk, uzman, randevu, tedavi, günlük takip ve içerik varlıklarının ilişkileri çıkarıldı. REST API üzerinden veri akışı ve JWT tabanlı kimlik doğrulama süreci takip edildi.",
        "Yeni modüllerin mevcut mimariye uyumlu eklenebilmesi için kodlama ve veri modeli ilkeleri belirlendi.",
    ),
    (
        "Topluluk ve Bildirim Modülü Tasarımı",
        "Ailelerin topluluk etkinliklerine katılımını ve haftalık sorulara yanıt vermesini sağlayacak akışlar tasarlandı. Etkinlik, katılımcı, haftalık soru, yanıt ve beğeni verileri için gerekli ilişkiler belirlendi.",
        "Mobil ve web bildirimleri için cihaz belirteci saklama, platform ayrımı ve kullanıcı bazlı gönderim gereksinimleri çıkarıldı. Bildirim izinleri ve başarısız gönderim durumlarının nasıl ele alınacağı planlandı.",
        "API uçları, servis sorumlulukları ve veritabanı geçişleri için teknik taslak hazırlandı.",
    ),
    (
        "Topluluk ve Anlık Bildirim Geliştirmeleri",
        "Topluluk etkinlikleri, katılımcılar, haftalık sorular ve yanıtlar için backend model, repository, service ve controller katmanları geliştirildi. Haftalık soru dönüşümü ve tekrarlı yanıt kuralları düzenlendi.",
        "FCM cihaz belirteci kaydı ve bildirim gönderim servisi eklendi. Frontend sayfaları yeni API'lerle bağlandı; rol bazlı menü görünürlüğü ve kullanıcı akışları güncellendi.",
        "Birim testleri ve temel API kontrolleri yapılarak modüllerin birlikte çalışması doğrulandı.",
    ),
    (
        "Bilgi Bankası ve CI/CD Altyapısı",
        "Dış kaynaklardan bilgi makalesi alma, içerikleri işleme ve yayın öncesi incelemeye ayırma özellikleri geliştirildi. Zamanlanmış içerik aktarımı, makale servisi ve gerekli veritabanı geçişleri eklendi.",
        "Haftalık soru ekranları ile bilgi bankası arayüzleri yenilendi. Backend ve frontend için GitHub Actions iş akışları oluşturularak derleme, test ve dağıtım adımları otomatikleştirildi.",
        "Testcontainers ve Playwright yapılandırmalarıyla hem servis hem kullanıcı akışı testlerinin çalışacağı temel hazırlandı.",
    ),
    (
        "Test ve Veritabanı Geçiş Planı",
        "Yeni eklenen bilgi bankası ve topluluk özellikleri için olumlu/olumsuz test senaryoları çıkarıldı. Yetkisiz erişim, eksik veri, tekrarlı kayıt ve harici kaynak hataları ele alındı.",
        "Flyway geçişlerinin farklı veritabanı durumlarında güvenli çalışması incelendi. Mevcut şemalarda bulunabilecek tablo, sütun ve indeksler için idempotent geçiş yaklaşımı planlandı.",
        "CI ortamında oluşabilecek veritabanı sürücüsü, örnek veri ve container başlatma sorunları için kontrol listesi hazırlandı.",
    ),
    (
        "Veritabanı, Rol ve PWA İyileştirmeleri",
        "Eksik pending_review sütunu için idempotent Flyway geçişi eklendi; Redis repository taraması devre dışı bırakılarak gereksiz uyarılar giderildi. CI/CD içinde container etiketi, Testcontainers sürücüsü ve SSH dağıtım adımları düzeltildi.",
        "Öğretmen rolü sisteme eklenerek kayıt, yetki ve portal akışları güncellendi. Benzer aile eşleştirme servisi iyileştirildi ve PWA davranışları gözden geçirildi.",
        "Frontend derleme hataları giderildi, başlangıç örnek verisi daha güvenli hâle getirildi ve ilgili testler çalıştırıldı.",
    ),
    (
        "FCM, Bilgi Bankası ve Yönetim İşlevleri",
        "Mobil FCM yapılandırması üretim ortamına uygun hâle getirildi; randevu bildirimlerine ilgili sayfaya yönlendiren bağlantılar eklendi. Bilgi bankasına yer imi, deneyim paylaşımı, içerik türü ve etiket filtreleri kazandırıldı.",
        "Yönetim panelinde gerçek veritabanı yedeği ve kullanıcı aktivitesi özeti geliştirildi. Yapay zekâ taslak durumları açık biçimde gösterildi, yasal bilgilendirme metinleri genişletildi.",
        "Frontend lint ve backend test hataları giderilerek CI sonuçları kontrol edildi.",
    ),
    (
        "Entegrasyon Testleri ve Hata Giderme",
        "Topluluk, bildirim, bilgi bankası ve yönetim modülleri uçtan uca gözden geçirildi. Rol bazlı erişim, kayıt güncelleme/silme, filtreleme ve bildirim yönlendirme senaryoları test edildi.",
        "API hata yanıtları ve frontend geri bildirimleri karşılaştırılarak kullanıcıya yansıyan tutarsızlıklar düzeltildi. Veritabanı geçişlerinin temiz ve mevcut şema üzerinde çalışma durumu kontrol edildi.",
        "Bulunan sorunlar önem derecesine göre sınıflandırıldı; kritik derleme ve çalışma zamanı hataları kapatıldı.",
    ),
    (
        "Arama, MFA ve KVKK Gereksinimleri",
        "Platform genelinde kullanılacak gelişmiş arama için içerik türleri, filtreler ve yetki sınırları belirlendi. RAG tabanlı yapay zekâ aramasında yalnızca erişilebilir içeriklerin kaynak olarak kullanılmasına yönelik yaklaşım tasarlandı.",
        "Yönetici hesapları için çok faktörlü kimlik doğrulama kurulumu; gizli anahtar üretimi, doğrulama ve kurtarma akışları incelendi. Sağlık verileri için açık rıza seçenekleri ve kayıt gereksinimleri çıkarıldı.",
        "Güvenlik ve kişisel veri işleme maddeleri teknik görevler hâline getirilerek uygulama planı güncellendi.",
    ),
    (
        "Hassas Veri ve Dosya Güvenliği Tasarımı",
        "Hassas alanların uygulama düzeyinde şifrelenmesi, anahtar yönetimi ve eski kayıtların geriye dönük dönüştürülmesi planlandı. Dosya erişimi için sahiplik/kapsam kontrolleri ve güvenli depolama modeli tasarlandı.",
        "Hesap silme, veri dışa aktarma, saklama süresi dolan kayıtları temizleme ve ilişkili verileri güvenli biçimde kaldırma süreçleri incelendi. E-posta doğrulama ve parola sıfırlama belirteçlerinin yaşam döngüsü değerlendirildi.",
        "Tehditler ve azaltıcı kontroller dokümante edilerek backend görevleri netleştirildi.",
    ),
    (
        "Backend Arama ve Güvenlik Geliştirmeleri",
        "Gelişmiş arama servisi, sorgu filtreleri ve ilgili API uçları geliştirildi. Sonuçların kullanıcının rolü ve erişim yetkileriyle sınırlandırılması sağlandı; controller ve service testleri eklendi.",
        "Hassas sütunlar için şifreleme dönüştürücüleri, güvenli dosya kapsamları, e-posta doğrulama ve hesap silme servisleri uygulandı. Correlation ID ve güvenlik filtreleriyle hata izlenebilirliği artırıldı.",
        "Flyway geçişleri hazırlanarak yeni alanların ve güvenlik tablolarının şemaya kontrollü biçimde eklenmesi sağlandı.",
    ),
    (
        "Frontend Kimlik Doğrulama ve Erişilebilirlik",
        "E-posta doğrulama, giriş ve kayıt akışları yeni backend yanıtlarıyla uyumlu hâle getirildi. Turnstile bileşeni, rota meta verileri ve servis çağrılarındaki hata yönetimi güncellendi.",
        "PWA servis worker davranışı, ikonlar ve yükleme ayarları gözden geçirildi. Form etiketleri, klavye erişimi, renk kontrastı ve sade kullanıcı dili açısından arayüz iyileştirmeleri yapıldı.",
        "Frontend birim testleri ve herkese açık sayfa senaryoları çalıştırılarak temel akışlar doğrulandı.",
    ),
    (
        "Bütünleşik Güvenlik ve Kullanıcı Akışı Testleri",
        "Arama, dosya yükleme, hesap yönetimi, e-posta doğrulama ve MFA akışları birlikte test edildi. Yetkisiz istekler, süresi dolmuş belirteçler ve hatalı dosya kapsamları için beklenen durum kodları doğrulandı.",
        "Veritabanı geçişleri hem boş hem mevcut veri içeren şemalarda denendi. Frontend ile backend arasındaki rol, hata mesajı ve oturum yenileme davranışları kontrol edildi.",
        "Test bulguları kaydedildi; üretime geçiş öncesinde düzeltilmesi gereken veritabanı ve kullanıcı deneyimi sorunları belirlendi.",
    ),
    (
        "Flyway, JPA ve Erişilebilirlik Çalışmaları",
        "Flyway geçişleri idempotent hâle getirildi ve checksum uyuşmazlıkları için repair-on-migrate yaklaşımı uygulandı. PostgreSQL cached plan ve nullable boolean alanlarından doğan hatalar JPA/yapılandırma değişiklikleriyle giderildi.",
        "Uzman lisans belgesi alanı ile günlük egzersiz sihirbazı eklendi. Kullanıcıya gösterilen hata metinleri sadeleştirildi; ekran sesli okuma, basit mod ve küresel erişilebilirlik seçenekleri geliştirildi.",
        "Başlangıç performansı ve üretim port bağlantısı iyileştirildi, kritik akışlar yeniden test edildi.",
    ),
    (
        "Gelişim Paneli ve Dokümantasyon",
        "Gelişim panelindeki yönlendirme, tarih ayrıştırma ve boş değer kaynaklı çökmeler düzeltildi. Oturumun zorunlu yenileme döngüsüne girmemesi için Error Boundary ve servis worker güncelleme davranışları ele alındı.",
        "Güncel PostgreSQL veritabanı dökümü projeye eklendi. Kullanılmayan rapor ve test dosyaları temizlendi; proje amacı, teknoloji yığını, kurulum ve dizin yapısını anlatan README hazırlandı.",
        "Frontend tip kontrolü ve temel regresyon testleri çalıştırılarak yapılan düzenlemeler doğrulandı.",
    ),
    (
        "Yönetim Paneli ve Profesyonel Arayüzler",
        "Yönetim paneli gezinme ve görünüm açısından yenilendi. İlaç-davranış zaman çizelgesi, disiplinler arası konsültasyon penceresi ve zaman damgalı video oynatıcı bileşenleri geliştirildi.",
        "Bildirim izni isteme ve bildirimleri gruplama/gösterme akışları iyileştirildi. Hasta, randevu ve tedavi sayfalarında tutarlı kart, buton ve durum bileşenleri kullanıldı.",
        "Responsive görünüm ile rol bazlı menü erişimi kontrol edildi; frontend derleme ve tip kontrolleri tamamlandı.",
    ),
    (
        "Platform Deneyimi ve Veri Modeli",
        "Kullanıcı profili, uzman bilgileri, randevu, çevrim içi durum ve benzer aile akışları için backend API ve veri modelleri güncellendi. Oturum notları ve uzman profil düzenleme istekleri eklendi.",
        "Frontend formları yeni alanlarla uyumlu hâle getirildi. Bilgi bankası içerikleri editöryal standarda taşındı; içerik görünürlüğü ve yönetim işlemlerinde rol bazlı erişim kontrolleri güçlendirildi.",
        "API sözleşmeleri ile frontend tipleri karşılaştırıldı, veri bütünlüğü ve yetki senaryoları test edildi.",
    ),
    (
        "KVKK Rıza ve Veri Sahibi Süreçleri",
        "Açık rıza kayıtlarının metin sürümü, zaman damgası ve kullanıcı tercihleriyle saklanması için model ve servisler geliştirildi. Kullanıcının rızasını görüntüleme ve geri çekme akışları düzenlendi.",
        "Erişim, düzeltme, silme ve dışa aktarma gibi veri sahibi başvuruları için takip edilebilir başvuru süreci eklendi. Saklama süresi dolan veriler için zamanlanmış imha işlemleri oluşturuldu.",
        "KVKK metinleri, renk kontrastı ve uçtan uca test beklentileri yeni akışlarla uyumlu hâle getirildi.",
    ),
    (
        "E-posta Entegrasyonu ve Dayanıklılık Testleri",
        "HTML e-posta şablonları; doğrulama, parola sıfırlama ve bildirim senaryoları üzerinden incelendi. Thymeleaf değişkenlerinin doğru doldurulması ve farklı istemcilerde okunabilir içerik üretmesi kontrol edildi.",
        "Değiştirilemez Map kullanımından kaynaklanan çalışma zamanı hatası giderildi. E-posta özelliğinin ortam değişkenleriyle güvenli biçimde açılıp kapanması, eksik SMTP bilgilerinin yönetimi ve loglarda hassas veri maskeleme davranışı test edildi.",
        "Başarılı ve başarısız gönderimlerin uygulamanın ana akışını kesmemesi doğrulandı.",
    ),
    (
        "Uçtan Uca ve Erişilebilirlik Testleri",
        "Herkese açık sayfalar, kayıt/giriş, gelişim paneli, bilgi bankası ve yönetim akışları için Playwright senaryoları çalıştırıldı. Yenilenen metin ve sayfa düzenlerine göre test beklentileri güncellendi.",
        "Klavye ile kullanım, odak sırası, semantik etiketler, mobil görünüm ve WCAG AA renk kontrastı kontrolleri yapıldı. Haftalık kart etiketindeki düşük kontrast giderildi.",
        "Regresyon sonuçları değerlendirilerek kritik kullanıcı yolculuklarının farklı ekran boyutlarında çalıştığı doğrulandı.",
    ),
    (
        "Performans, Yedekleme ve Dağıtım Kontrolleri",
        "API ve WebSocket yük testi betikleri kullanılarak temel performans davranışı incelendi. Uygulama başlangıç süresi, bağlantı havuzu ve Redis sağlık kontrolü ayarlarının etkileri değerlendirildi.",
        "PostgreSQL yedekleme ve geri yükleme betikleri test edilerek hata durumları ve veri bütünlüğü kontrol edildi. Üretim Docker Compose, ortam değişkenleri ve CI/CD dağıtım adımları gözden geçirildi.",
        "Dağıtım öncesi kontrol listesi güncellendi ve tekrar üretilebilir bakım adımları dokümante edildi.",
    ),
    (
        "Son Kabul Testleri ve Teknik Raporlama",
        "Staj boyunca geliştirilen modüller için son kabul kontrolleri yapıldı. Kimlik doğrulama, rol bazlı yetki, topluluk, bildirim, bilgi bankası, gelişim takibi, yönetim ve KVKK akışları bütün olarak değerlendirildi.",
        "Backend testleri, frontend derleme/tip kontrolleri ve uçtan uca senaryoların sonuçları gözden geçirildi. Güvenlik ayarları, veritabanı geçişleri, yedekleme ve dağıtım dokümanları son kez kontrol edildi.",
        "Gerçekleştirilen çalışmalar, edinilen teknik kazanımlar ve geliştirme önerileri staj raporu için özetlendi.",
    ),
]


def fmt(d: date) -> str:
    return d.strftime("%d.%m.%Y")


def wrap(text: str, font: str, size: float, width: float) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = word if not current else f"{current} {word}"
        if pdfmetrics.stringWidth(trial, font, size) <= width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped(c: canvas.Canvas, text: str, x: float, y: float, width: float,
                 font: str = "Arial", size: float = 10.5, leading: float = 15) -> float:
    c.setFont(font, size)
    for line in wrap(text, font, size, width):
        c.drawString(x, y, line)
        y -= leading
    return y


def value(c: canvas.Canvas, x: float, y: float, text: str, size: float = 9.5,
          max_width: float | None = None) -> None:
    if not text:
        return
    chosen = size
    if max_width:
        while chosen > 6 and pdfmetrics.stringWidth(text, "Arial", chosen) > max_width:
            chosen -= 0.25
    c.setFont("Arial", chosen)
    c.setFillColor(black)
    c.drawString(x, y, text)


def overlay_for_page(index: int, args: argparse.Namespace) -> bytes:
    stream = io.BytesIO()
    c = canvas.Canvas(stream, pagesize=(PAGE_WIDTH, PAGE_HEIGHT))

    if index == 0:  # Kapak
        value(c, 350, 158, args.student_no, 11)
        value(c, 350, 134, args.name, 11)
    elif index == 1:  # Öğretim yılı
        c.setFillColor(white)
        c.rect(225, 718, 195, 62, fill=1, stroke=0)
        c.setFillColor(black)
        c.setFont("Arial-Bold", 10)
        c.drawString(245, 750, "ÖĞRETİM YILI 2025/")
        c.drawString(311, 734, "2026")
    elif index == 2:  # Kimlik ve kurum bilgileri
        value(c, 164, 638, args.name, max_width=190)
        value(c, 164, 618, args.father_name, max_width=190)
        value(c, 164, 598, args.birth_place, max_width=190)
        value(c, 164, 578, "Bilgisayar Mühendisliği", max_width=190)
        value(c, 164, 558, args.class_year, max_width=190)
        value(c, 164, 539, args.student_no, max_width=190)

        value(c, 200, 458, args.institution, max_width=290)
        value(c, 200, 438, args.subject, max_width=290)
        value(c, 200, 418, "29.06.2026")
        value(c, 200, 398, "31.07.2026")
        value(c, 200, 378, "24 iş günü")
        value(c, 372, 323, args.supervisor, max_width=123)
        value(c, 372, 303, args.supervisor_title, max_width=123)
    elif index == 3:  # Staj programı
        programs = [
            ("29.06.2026", "03.07.2026", "5", "Analiz, mimari ve topluluk modülü"),
            ("06.07.2026", "10.07.2026", "5", "Bilgi bankası, bildirim ve CI/CD"),
            ("13.07.2026", "17.07.2026", "4", "Arama, güvenlik, MFA ve KVKK"),
            ("20.07.2026", "24.07.2026", "5", "Veritabanı, erişilebilirlik ve yönetim"),
            ("27.07.2026", "31.07.2026", "5", "KVKK, test, dağıtım ve raporlama"),
        ]
        row_y = 570
        for start, end, count, topic in programs:
            value(c, 76, row_y, start, 6.6, 50)
            value(c, 129, row_y, end, 6.6, 57)
            value(c, 216, row_y, count, 8)
            value(c, 273, row_y, topic, 7, 155)
            value(c, 445, row_y, args.supervisor, 7, 74)
            row_y -= 24.5
    elif index == 4:  # Günlük özet tablosu
        row_y = 608
        for d, summary in zip(WORK_DAYS, SUMMARY):
            value(c, 102, row_y, fmt(d), 6.5, 67)
            value(c, 184, row_y, DAY_NAMES[d.weekday()], 6.5, 47)
            value(c, 241, row_y, summary, 6.8, 283)
            row_y -= 19.0
    elif 7 <= index <= 30:  # PDF sayfa 8-31: 24 günlük ayrıntılı rapor
        day_index = index - 7
        d = WORK_DAYS[day_index]
        title, *paragraphs = DETAILS[day_index]
        c.setFillColor(white)
        c.rect(315, 764, 216, 34, fill=1, stroke=0)
        c.setFillColor(black)
        c.setFont("Arial-Bold", 9.5)
        c.drawString(380, 780, f"Tarih: {fmt(d)}")
        c.setFont("Arial-Bold", 12)
        c.drawString(72, 726, f"{day_index + 1}. Gün — {title}")
        y = 697
        for paragraph in paragraphs:
            y = draw_wrapped(c, paragraph, 72, y, 450)
            y -= 14
        c.setFont("Arial", 9)
        c.drawString(72, 90, "Kullanılan teknolojiler: React, TypeScript, Java, Spring Boot, PostgreSQL, Redis, Docker, Git")

    c.save()
    return stream.getvalue()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--name", default="Enes Kotay")
    parser.add_argument("--student-no", default="")
    parser.add_argument("--father-name", default="")
    parser.add_argument("--birth-place", default="")
    parser.add_argument("--class-year", default="")
    parser.add_argument("--institution", default="")
    parser.add_argument("--supervisor", default="")
    parser.add_argument("--supervisor-title", default="")
    parser.add_argument(
        "--subject",
        default="Otizm Destek Platformu web uygulamasının geliştirilmesi",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if len(WORK_DAYS) != 24 or len(SUMMARY) != 24 or len(DETAILS) != 24:
        raise RuntimeError("Çalışma günü verileri 24 kayıt içermelidir")

    pdfmetrics.registerFont(TTFont("Arial", FONT_REGULAR))
    pdfmetrics.registerFont(TTFont("Arial-Bold", FONT_BOLD))

    reader = PdfReader(str(args.input))
    writer = PdfWriter()
    for index, source_page in enumerate(reader.pages):
        if index <= 4 or 7 <= index <= 30:
            overlay = PdfReader(io.BytesIO(overlay_for_page(index, args))).pages[0]
            source_page.merge_page(overlay)
        writer.add_page(source_page)

    if reader.metadata:
        metadata = {k: str(v) for k, v in reader.metadata.items() if v is not None}
        metadata["/Title"] = "Doldurulmuş Staj Defteri"
        writer.add_metadata(metadata)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("wb") as output_file:
        writer.write(output_file)


if __name__ == "__main__":
    main()
