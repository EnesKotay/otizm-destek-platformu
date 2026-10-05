#!/usr/bin/env python3
"""Staj defteri PDF'sindeki kapak, tablo ve tarih bicimi sorunlarini duzeltir."""

from __future__ import annotations

import argparse
import io
from datetime import date
from pathlib import Path

from PyPDF2 import PdfReader, PdfWriter
from reportlab.lib.colors import black, white
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


PAGE_WIDTH = 595
PAGE_HEIGHT = 842
FONT_REGULAR = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

WORK_DAYS = [
    date(2026, 6, 29),
    date(2026, 6, 30),
    date(2026, 7, 1),
    date(2026, 7, 2),
    date(2026, 7, 3),
    date(2026, 7, 6),
    date(2026, 7, 7),
    date(2026, 7, 8),
    date(2026, 7, 9),
    date(2026, 7, 10),
    date(2026, 7, 13),
    date(2026, 7, 14),
    date(2026, 7, 16),
    date(2026, 7, 17),
    date(2026, 7, 20),
    date(2026, 7, 21),
    date(2026, 7, 22),
    date(2026, 7, 23),
    date(2026, 7, 24),
    date(2026, 7, 27),
    date(2026, 7, 28),
    date(2026, 7, 29),
    date(2026, 7, 30),
    date(2026, 7, 31),
]

DAY_NAMES = {
    0: "Pazartesi",
    1: "Salı",
    2: "Çarşamba",
    3: "Perşembe",
    4: "Cuma",
}

SHORT_SUMMARIES = [
    "Oryantasyon ve proje kapsamının incelenmesi",
    "Geliştirme ortamının kurulması ve yerel çalıştırma",
    "Backend mimarisi ve veri modelinin incelenmesi",
    "Frontend mimarisi ve kimlik doğrulama akışı",
    "Topluluk modülü ve Web Push altyapısı",
    "Buluşma talebi akışının geliştirilmesi",
    "İçerik aktarımı ve haftalık soru modülü",
    "CI/CD hattı, öğretmen portalı ve PWA desteği",
    "Mobil bildirim ve bilgi bankası geliştirmeleri",
    "Yönetim paneli ve test güncellemeleri",
    "Spring Security ve yetkilendirme incelemesi",
    "Hassas veriler için şifreleme tasarımı",
    "Veri şifreleme ve dosya erişim güvenliği",
    "E-posta doğrulama, hız sınırlama ve bot koruma",
    "Gelişmiş arama, RAG ve yönetici MFA",
    "Üretim hataları ve başlangıç performansı",
    "Erişilebilirlik ve kullanıcı deneyimi geliştirmeleri",
    "Gelişim paneli hataları ve dokümantasyon",
    "Yönetim panelinin geliştirilmesi",
    "Veri modeli ve bilgi bankası güncellemeleri",
    "Uçtan uca testler ve erişilebilirlik düzeltmeleri",
    "HTML e-posta bildirim altyapısı",
    "KVKK modülünün sunucu tarafı",
    "KVKK arayüzleri, genel test ve teslim",
]


def white_rect(c: canvas.Canvas, x: float, y: float, width: float, height: float) -> None:
    c.setFillColor(white)
    c.setStrokeColor(white)
    c.rect(x, y, width, height, fill=1, stroke=0)
    c.setFillColor(black)
    c.setStrokeColor(black)


def fit_text(c: canvas.Canvas, text: str, font: str, size: float, max_width: float) -> float:
    chosen = size
    while chosen > 7 and pdfmetrics.stringWidth(text, font, chosen) > max_width:
        chosen -= 0.1
    return chosen


def draw_cover(c: canvas.Canvas, source: PdfReader) -> None:
    # Eski logoları ve sayfa dışına taşan mavi logoyu kapat.
    white_rect(c, 0, 680, 188, 112)

    page_images = list(source.pages[0].images)
    if len(page_images) < 2:
        raise RuntimeError("Kapaktaki logo görselleri bulunamadı")

    red_logo = ImageReader(io.BytesIO(page_images[0].data))
    blue_logo = ImageReader(io.BytesIO(page_images[1].data))
    c.drawImage(blue_logo, 10, 694, 80, 80, preserveAspectRatio=True, mask="auto")
    c.drawImage(red_logo, 100, 694, 80, 80, preserveAspectRatio=True, mask="auto")

    # Kopuk "İ" dâhil eski başlığı temizleyip tek parça ve ortalı yeniden yaz.
    white_rect(c, 38, 342, 514, 150)
    c.setFont("Arial-Bold", 46)
    c.drawCentredString(PAGE_WIDTH / 2, 385, "STAJ DEFTERİ")


def draw_academic_year(c: canvas.Canvas) -> None:
    white_rect(c, 226, 712, 146, 47)
    c.setFont("Arial-Bold", 12)
    c.drawCentredString(PAGE_WIDTH / 2, 733, "ÖĞRETİM YILI 2025/2026")


def draw_supervisor_signature_fields(c: canvas.Canvas) -> None:
    # Sağa yaslanmış eski alanı temizle ve elle doldurmaya uygun satırlar bırak.
    white_rect(c, 344, 268, 201, 78)

    c.setFont("Arial-Bold", 10.5)
    c.drawString(350, 329, "İşyeri-Müessese Amirinin")

    c.setFont("Arial", 9.5)
    c.drawString(350, 309, "Adı, Soyadı : Hidayet TAKÇI")
    c.drawString(350, 289, "Unvanı :")
    c.line(396, 287, 539, 287)
    c.drawString(350, 269, "Mühür ve İmza :")
    c.line(430, 267, 539, 267)


def draw_workday_wording_fixes(c: canvas.Canvas) -> None:
    # "işgünü" ifadesini doğru ve ayrı yazımla yeniden oluştur.
    white_rect(c, 140, 765, 315, 20)
    c.setFont("Arial", 10)
    c.drawCentredString(
        PAGE_WIDTH / 2,
        772,
        "Yapılan pratik çalışma 24 (yirmi dört) iş günü olarak kabul edilmiştir.",
    )

    # Tablo ızgarasını silmeden yalnızca hücre içindeki yanlış ifadeyi kapat.
    white_rect(c, 172, 606, 38, 15)
    c.setFont("Arial-Bold", 7.2)
    c.drawCentredString(191, 609, "(İş günü)")


def draw_summary_table(c: canvas.Canvas) -> None:
    white_rect(c, 0, 0, PAGE_WIDTH, PAGE_HEIGHT)

    c.setFont("Arial-Bold", 13)
    c.drawCentredString(PAGE_WIDTH / 2, 773, "GÜNLÜK ÇALIŞMA PROGRAMI")

    left = 48
    right = 547
    columns = [left, 82, 151, 221, right]
    table_top = 742
    header_height = 29
    row_height = 22.5
    table_bottom = table_top - header_height - row_height * len(WORK_DAYS)

    c.setLineWidth(0.55)
    c.rect(left, table_bottom, right - left, table_top - table_bottom, fill=0, stroke=1)
    for x in columns[1:-1]:
        c.line(x, table_bottom, x, table_top)
    c.line(left, table_top - header_height, right, table_top - header_height)
    for row_index in range(1, len(WORK_DAYS) + 1):
        y = table_top - header_height - row_height * row_index
        c.line(left, y, right, y)

    centers = [
        (columns[0] + columns[1]) / 2,
        (columns[1] + columns[2]) / 2,
        (columns[2] + columns[3]) / 2,
        (columns[3] + columns[4]) / 2,
    ]
    c.setFont("Arial-Bold", 8.2)
    header_y = table_top - 18
    for center, label in zip(centers, ["S.No", "Tarih", "Gün", "Yapılan İş"]):
        c.drawCentredString(center, header_y, label)

    for row_index, (work_day, summary) in enumerate(zip(WORK_DAYS, SHORT_SUMMARIES), start=1):
        baseline = table_top - header_height - row_height * row_index + 7.5
        c.setFont("Arial", 7.7)
        c.drawCentredString(centers[0], baseline, str(row_index))
        c.drawCentredString(centers[1], baseline, work_day.strftime("%d.%m.%Y"))
        c.drawCentredString(centers[2], baseline, DAY_NAMES[work_day.weekday()])

        text_size = fit_text(c, summary, "Arial", 7.8, columns[4] - columns[3] - 10)
        c.setFont("Arial", text_size)
        c.drawString(columns[3] + 5, baseline, summary)

    c.setFont("Arial", 9.5)
    c.drawRightString(right, 122, "Onaylayan Mühendis")
    c.drawRightString(right, 101, "Adı ve Soyadı : Hidayet TAKÇI")
    c.drawRightString(right, 80, "İmza :")


def draw_consistent_date(c: canvas.Canvas, work_day: date) -> None:
    white_rect(c, 454, 775, 98, 22)
    c.setFont("Arial", 9.5)
    c.drawRightString(548, 780, f"Tarih: {work_day.strftime('%d.%m.%Y')}")


def make_overlay(page_index: int, source: PdfReader) -> bytes:
    stream = io.BytesIO()
    c = canvas.Canvas(stream, pagesize=(PAGE_WIDTH, PAGE_HEIGHT))

    if page_index == 0:
        draw_cover(c, source)
    elif page_index == 1:
        draw_academic_year(c)
    elif page_index == 2:
        draw_supervisor_signature_fields(c)
    elif page_index == 3:
        draw_workday_wording_fixes(c)
    elif page_index == 4:
        draw_summary_table(c)
    elif 5 <= page_index <= 28:
        draw_consistent_date(c, WORK_DAYS[page_index - 5])

    c.save()
    return stream.getvalue()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    pdfmetrics.registerFont(TTFont("Arial", FONT_REGULAR))
    pdfmetrics.registerFont(TTFont("Arial-Bold", FONT_BOLD))

    source = PdfReader(str(args.input))
    if len(source.pages) != 31:
        raise RuntimeError(f"31 sayfa bekleniyordu, {len(source.pages)} sayfa bulundu")

    writer = PdfWriter()
    changed_pages = {0, 1, 2, 3, 4, *range(5, 29)}
    for page_index, page in enumerate(source.pages):
        if page_index in changed_pages:
            overlay_page = PdfReader(io.BytesIO(make_overlay(page_index, source))).pages[0]
            page.merge_page(overlay_page)

    # Yönergenin devamı olan son iki sayfayı raporun arkasından alıp
    # kimlik/kurum sayfasından hemen sonraya taşı.
    page_order = [0, 1, 2, 29, 30, *range(3, 29)]
    for page_index in page_order:
        writer.add_page(source.pages[page_index])

    if source.metadata:
        metadata = {key: str(value) for key, value in source.metadata.items() if value is not None}
        metadata["/Title"] = "Düzeltilmiş Staj Defteri"
        writer.add_metadata(metadata)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("wb") as output_file:
        writer.write(output_file)


if __name__ == "__main__":
    main()
