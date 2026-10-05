#!/usr/bin/env python3
"""Gizli sicil PDF'sine doğrulanmış öğrenci ve staj bilgilerini işler."""

from io import BytesIO
from pathlib import Path
from typing import Optional

from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


SOURCE = Path("/Users/eneskotay/Documents/Form11-Gizli_sicil_Formu.pdf")
OUTPUT = Path("/Users/eneskotay/Development/Otizm/Form11-Gizli_sicil_Formu_doldurulmus.pdf")
FONT_PATH = Path("/System/Library/Fonts/Supplemental/Arial.ttf")


def draw_value(
    page: canvas.Canvas,
    x: float,
    y: float,
    value: str,
    *,
    size: float = 10,
    clear_width: float = 0,
    centered_at: Optional[float] = None,
) -> None:
    """Draw a value, optionally masking the dotted guide beneath it."""
    if clear_width:
        page.setFillColorRGB(1, 1, 1)
        page.rect(x - 1, y - 2, clear_width, size + 4, fill=1, stroke=0)
    page.setFillColorRGB(0, 0, 0)
    page.setFont("Arial", size)
    if centered_at is None:
        page.drawString(x, y, value)
    else:
        page.drawCentredString(centered_at, y, value)


def build_overlay(width: float, height: float) -> BytesIO:
    stream = BytesIO()
    page = canvas.Canvas(stream, pagesize=(width, height))
    pdfmetrics.registerFont(TTFont("Arial", str(FONT_PATH)))

    # Basılı şablondaki noktalı doldurma çizgilerini temizle.
    page.setFillColorRGB(1, 1, 1)
    dotted_areas = (
        (74, 586, 195, 8),   # Adı soyadı
        (74, 538, 195, 8),   # Doğum yeri
        (74, 490, 195, 8),   # Doğum tarihi
        (167, 402, 103, 10), # İşe başlama tarihi
        (404, 402, 105, 10), # İşten ayrılma tarihi
        (170, 369, 100, 11), # Çalıştığı gün sayısı
        (100, 352, 110, 11), # Alt satıra taşan noktalı kılavuz
        (403, 369, 106, 11), # Çalışmadığı gün sayısı
        (74, 248, 436, 36),  # Çalıştığı şube veya birimler
    )
    for x, y, rect_width, rect_height in dotted_areas:
        page.rect(x, y, rect_width, rect_height, fill=1, stroke=0)

    draw_value(page, 76, 590, "Enes KOTAY", size=10.5)
    draw_value(page, 76, 542, "Mersin", size=10.5)
    draw_value(page, 76, 494, "10.12.2002", size=10.5)
    draw_value(page, 258, 456, "4. Sınıf / 2021123079", size=9.5, clear_width=123)

    draw_value(page, 172, 407, "29.06.2026", size=9.5)
    draw_value(page, 426, 407, "31.07.2026", size=9.5)
    draw_value(page, 173, 374, "24", size=9.5)
    draw_value(page, 405, 374, "1 (resmî tatil)", size=9.5)

    draw_value(
        page,
        95,
        270,
        "Yazılım Geliştirme Birimi — Hidayet Takçı Bilişim",
        size=9.5,
        centered_at=297.5,
    )

    page.save()
    stream.seek(0)
    return stream


def main() -> None:
    source = PdfReader(str(SOURCE))
    first_page = source.pages[0]
    width = float(first_page.mediabox.width)
    height = float(first_page.mediabox.height)
    overlay = PdfReader(build_overlay(width, height))
    first_page.merge_page(overlay.pages[0])

    writer = PdfWriter()
    # Kaynak dosyanın ikinci sayfası tamamen boş; baskı çıktısına eklenmez.
    writer.add_page(first_page)
    writer.add_metadata(
        {
            "/Title": "Doldurulmuş Gizli Sicil Formu",
            "/Author": "Enes KOTAY",
        }
    )
    with OUTPUT.open("wb") as output_file:
        writer.write(output_file)


if __name__ == "__main__":
    main()
