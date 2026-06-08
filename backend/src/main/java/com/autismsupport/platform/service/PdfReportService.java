package com.autismsupport.platform.service;

import com.autismsupport.platform.model.*;
import com.autismsupport.platform.repository.*;
import com.autismsupport.platform.service.AiInsightsService.AnalysisType;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PdfReportService {
    private final ChildRepository childRepository;
    private final DevelopmentNoteRepository noteRepository;
    private final MilestoneRepository milestoneRepository;
    private final UserRepository userRepository;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    public byte[] generateChildReport(UUID childId, UUID userId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new RuntimeException("Çocuk bulunamadı"));
        if (!child.getParent().getId().equals(userId)) {
            throw new RuntimeException("Bu rapora erişim yetkiniz yok");
        }

        List<DevelopmentNote> notes = noteRepository.findByChildId(childId);
        List<Milestone> milestones = milestoneRepository.findByChildIdOrderByAchievedDateDesc(childId);

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 40, 40, 60, 40);
            PdfWriter.getInstance(doc, out);
            doc.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, new Color(67, 56, 202));
            Font headFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, new Color(55, 65, 81));
            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 10, new Color(75, 85, 99));
            Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 9, new Color(156, 163, 175));

            // Header
            Paragraph title = new Paragraph("Gelisim Raporu", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(4);
            doc.add(title);

            Paragraph sub = new Paragraph("Otizm Destek Platformu", smallFont);
            sub.setAlignment(Element.ALIGN_CENTER);
            sub.setSpacingAfter(20);
            doc.add(sub);

            // Child Info
            doc.add(new Paragraph("Cocuk Bilgileri", headFont));
            doc.add(new Paragraph("Ad: " + child.getName(), bodyFont));
            if (child.getBirthDate() != null) {
                doc.add(new Paragraph("Dogum Tarihi: " + child.getBirthDate().format(FMT), bodyFont));
            }
            if (child.getDiagnosisInfo() != null && !child.getDiagnosisInfo().isEmpty()) {
                doc.add(new Paragraph("Tani Bilgisi: " + child.getDiagnosisInfo(), bodyFont));
            }
            doc.add(Chunk.NEWLINE);

            // Notes
            doc.add(new Paragraph("Gelisim Notlari (" + notes.size() + ")", headFont));
            doc.add(Chunk.NEWLINE);
            if (notes.isEmpty()) {
                doc.add(new Paragraph("Henuz not eklenmemis.", bodyFont));
            } else {
                for (DevelopmentNote note : notes.stream().limit(20).toList()) {
                    Paragraph noteTitle = new Paragraph("* " + note.getTitle(), bodyFont);
                    noteTitle.setSpacingBefore(6);
                    doc.add(noteTitle);
                    if (note.getNoteDate() != null) {
                        doc.add(new Paragraph("  Tarih: " + note.getNoteDate().format(FMT), smallFont));
                    }
                    if (note.getContent() != null) {
                        String excerpt = note.getContent().length() > 200 ? note.getContent().substring(0, 200) + "..." : note.getContent();
                        doc.add(new Paragraph("  " + excerpt, bodyFont));
                    }
                }
            }
            doc.add(Chunk.NEWLINE);

            // Milestones
            doc.add(new Paragraph("Kilometre Taslari (" + milestones.size() + ")", headFont));
            doc.add(Chunk.NEWLINE);
            if (milestones.isEmpty()) {
                doc.add(new Paragraph("Henuz kilometre tasi eklenmemis.", bodyFont));
            } else {
                for (Milestone m : milestones) {
                    Paragraph mp = new Paragraph("* " + m.getTitle(), bodyFont);
                    mp.setSpacingBefore(4);
                    doc.add(mp);
                    if (m.getAchievedDate() != null) {
                        doc.add(new Paragraph("  " + m.getAchievedDate().format(FMT), smallFont));
                    }
                }
            }

            // Footer
            doc.add(Chunk.NEWLINE);
            doc.add(Chunk.NEWLINE);
            Paragraph footer = new Paragraph("Bu rapor Otizm Destek Platformu tarafindan olusturulmustur.", smallFont);
            footer.setAlignment(Element.ALIGN_CENTER);
            doc.add(footer);

            doc.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("PDF olusturulamadi: " + e.getMessage());
        }
    }

    public byte[] generateAiInsightsPdf(UUID childId, UUID userId, AnalysisType analysisType, String aiText) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new RuntimeException("Cocuk bulunamadi"));
        if (!child.getParent().getId().equals(userId)) {
            throw new RuntimeException("Bu rapora erisim yetkiniz yok");
        }

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 50, 50, 70, 50);
            PdfWriter.getInstance(doc, out);
            doc.open();

            Font titleFont   = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, new Color(67, 56, 202));
            Font labelFont   = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, new Color(55, 65, 81));
            Font bodyFont    = FontFactory.getFont(FontFactory.HELVETICA, 10, new Color(55, 65, 81));
            Font smallFont   = FontFactory.getFont(FontFactory.HELVETICA, 9, new Color(156, 163, 175));
            Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, new Color(99, 102, 241));
            Font hrFont      = FontFactory.getFont(FontFactory.HELVETICA, 6, new Color(199, 210, 254));

            // Başlık
            Paragraph title = new Paragraph("Otizm Destek Platformu - AI Analiz Raporu", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(4);
            doc.add(title);

            Paragraph genDate = new Paragraph("Olusturulma: " + LocalDate.now().format(FMT), smallFont);
            genDate.setAlignment(Element.ALIGN_CENTER);
            genDate.setSpacingAfter(12);
            doc.add(genDate);

            // Ayraç çizgisi (karakter tabanlı)
            Paragraph hr = new Paragraph("________________________________________" +
                    "________________________________________", hrFont);
            hr.setAlignment(Element.ALIGN_CENTER);
            hr.setSpacingAfter(10);
            doc.add(hr);

            // Çocuk & analiz bilgisi
            doc.add(new Paragraph("Cocuk: " + child.getName(), labelFont));
            if (child.getBirthDate() != null) {
                doc.add(new Paragraph("Dogum: " + child.getBirthDate().format(FMT), bodyFont));
            }
            doc.add(new Paragraph("Analiz Turu: " + analysisTypeLabel(analysisType), bodyFont));
            doc.add(Chunk.NEWLINE);

            // AI Analiz metni — paragraf bazlı
            doc.add(new Paragraph("Yapay Zeka Analizi", sectionFont));
            doc.add(Chunk.NEWLINE);

            for (String paragraph : aiText.split("\n\n")) {
                String cleaned = paragraph.trim();
                if (cleaned.isEmpty()) continue;

                // **Bold başlık** → kalın font
                if (cleaned.startsWith("**") && cleaned.endsWith("**")) {
                    String heading = cleaned.substring(2, cleaned.length() - 2);
                    Paragraph h = new Paragraph(heading, labelFont);
                    h.setSpacingBefore(10);
                    h.setSpacingAfter(4);
                    doc.add(h);
                } else {
                    // Satır içi **bold** pattern'i düz metne çevir (OpenPDF sınırlaması)
                    String plain = cleaned.replaceAll("\\*\\*([^*]+)\\*\\*", "$1");
                    Paragraph p = new Paragraph(plain, bodyFont);
                    p.setSpacingAfter(6);
                    doc.add(p);
                }
            }

            // Footer
            doc.add(Chunk.NEWLINE);
            doc.add(hr);
            doc.add(Chunk.NEWLINE);
            Paragraph footer = new Paragraph(
                    "Bu rapor Otizm Destek Platformu yapay zeka modeli tarafindan olusturulmustur. " +
                    "Klinik karar icin bir uzmana danismaniz onerilir.", smallFont);
            footer.setAlignment(Element.ALIGN_CENTER);
            doc.add(footer);

            doc.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("AI analiz PDF olusturulamadi: " + e.getMessage());
        }
    }

    private String analysisTypeLabel(AnalysisType type) {
        return switch (type) {
            case WEEKLY          -> "Haftalik Ozet";
            case BEHAVIORAL      -> "Davranis Analizi";
            case PROGRESS        -> "Ilerleme Raporu";
            case SLEEP_BEHAVIOR  -> "Uyku-Davranis Korelasyonu";
            case EXPERT_REPORT   -> "Uzman Raporu";
            case BEP_SUGGESTIONS -> "BEP Hedef Onerileri";
            default              -> "Genel Analiz";
        };
    }
}
