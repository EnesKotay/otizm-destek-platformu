package com.autismsupport.platform.service;

import com.autismsupport.platform.model.ABCEntry;
import com.autismsupport.platform.model.Appointment;
import com.autismsupport.platform.model.ConsentType;
import com.autismsupport.platform.model.DevelopmentNote;
import com.autismsupport.platform.model.Goal;
import com.autismsupport.platform.model.Milestone;
import com.autismsupport.platform.model.MoodEntry;
import com.autismsupport.platform.model.ScreeningResult;
import com.autismsupport.platform.model.SleepEntry;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.ABCEntryRepository;
import com.autismsupport.platform.repository.AppointmentRepository;
import com.autismsupport.platform.repository.DevelopmentNoteRepository;
import com.autismsupport.platform.repository.GoalRepository;
import com.autismsupport.platform.repository.MilestoneRepository;
import com.autismsupport.platform.repository.MoodEntryRepository;
import com.autismsupport.platform.repository.ScreeningResultRepository;
import com.autismsupport.platform.repository.SleepEntryRepository;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.exception.ResourceNotFoundException;
import com.autismsupport.platform.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiInsightsService {

    private final GeminiService geminiService;
    private final ConsentService consentService;
    private final ChildRepository childRepository;
    private final MoodEntryRepository moodRepo;
    private final SleepEntryRepository sleepRepo;
    private final ABCEntryRepository abcRepo;
    private final MilestoneRepository milestoneRepo;
    private final DevelopmentNoteRepository noteRepo;
    private final ScreeningResultRepository screeningRepo;
    private final AppointmentRepository appointmentRepo;
    private final GoalRepository goalRepo;

    public enum AnalysisType {
        GENERAL, BEHAVIORAL, PROGRESS, WEEKLY,
        SLEEP_BEHAVIOR, EXPERT_REPORT, BEP_SUGGESTIONS, DAILY_COACH
    }

    public String generateInsights(UUID childId, AnalysisType type, UUID requesterId, String requesterRole) {
        validateChildAccess(childId, requesterId, requesterRole);
        requireAiConsent(childId);
        return generateInsights(childId, type);
    }

    private String generateInsights(UUID childId, AnalysisType type) {
        return switch (type) {
            case BEHAVIORAL      -> generateBehavioralAnalysis(childId);
            case PROGRESS        -> generateProgressReport(childId);
            case WEEKLY          -> generateWeeklySummary(childId);
            case SLEEP_BEHAVIOR  -> generateSleepBehaviorCorrelation(childId);
            case EXPERT_REPORT   -> generateExpertReport(childId);
            case BEP_SUGGESTIONS -> generateBepSuggestions(childId);
            case DAILY_COACH     -> geminiService.sendMessage(buildDailyCoachPrompt(childId), null, "Gunluk Koc Notu");
            default              -> generateCorrelations(childId);
        };
    }

    public String buildPromptForStreaming(UUID childId, AnalysisType type, UUID requesterId, String requesterRole) {
        validateChildAccess(childId, requesterId, requesterRole);
        requireAiConsent(childId);
        return buildPromptForStreaming(childId, type);
    }

    private String buildPromptForStreaming(UUID childId, AnalysisType type) {
        if (type == AnalysisType.DAILY_COACH) return buildDailyCoachPrompt(childId);

        LocalDate cutoff = switch (type) {
            case WEEKLY          -> LocalDate.now().minusDays(7);
            case BEHAVIORAL      -> LocalDate.now().minusDays(60);
            case SLEEP_BEHAVIOR  -> LocalDate.now().minusDays(60);
            default              -> LocalDate.now().minusDays(30);
        };

        String moods  = buildMoodSummary(childId, cutoff);
        String sleeps = buildSleepSummary(childId, cutoff);
        String abcs   = buildAbcSummary(childId, cutoff);

        return switch (type) {
            case BEHAVIORAL -> """
                    Sen otizm alaninda uzman bir davranis analisti yapay zekasisin.
                    Asagidaki ABC kayitlarini analiz et ve davranis kaliplarini, tetikleyicileri ve stratejileri acikla.
                    FORMAT: **Tetikleyici Kaliplari**, **Davranis Islevleri**, **Isleyen Stratejiler**, **Oneriler**
                    """ + "ABC KAYITLARI:\n" + (abcs.isEmpty() ? "Kayit yok" : abcs);
            case WEEKLY -> """
                    Son 7 gunun kisa, destekleyici bir ozetini yaz.
                    FORMAT: **Bu Hafta Ozeti**, **Iyi Giden Seyler**, **Dikkat Gerektiren Anlar**, **Gelecek Hafta Icin**
                    """ + "RUH HALI:\n" + moods + "\n\nUYKU:\n" + sleeps + "\n\nDAVRANIS:\n" + abcs;
            case PROGRESS -> {
                String milestones = buildMilestoneSummary(childId, LocalDate.now().minusDays(365));
                String notes = buildNotesSummary(childId, LocalDate.now().minusDays(365));
                yield """
                        Kapsamli ilerleme raporu hazirla.
                        FORMAT: **Genel Ilerleme**, **Parlayan Alanlar**, **Gelisme Firsatlari**, **Sonraki Adimlar**
                        """ + "KILOMETRE TASLARI:\n" + milestones + "\n\nGELISIM NOTLARI:\n" + notes;
            }
            case SLEEP_BEHAVIOR -> buildSleepBehaviorPrompt(childId, cutoff);
            case EXPERT_REPORT  -> buildExpertReportPrompt(childId);
            case BEP_SUGGESTIONS -> buildBepSuggestionsPrompt(childId);
            default -> {
                String milestones = buildMilestoneSummary(childId, cutoff);
                String notes = buildNotesSummary(childId, cutoff);
                String screenings = buildScreeningSummary(childId);
                yield """
                        Verileri analiz et, korelasyonlari ve pratik onerileri paylas.
                        FORMAT: **Genel Degerlendirme**, **Dikkat Ceken Baglantilar**, **Guclu Yonler**, **Pratik Oneriler**
                        """ + buildDataBlock(moods, sleeps, abcs, milestones, notes, screenings);
            }
        };
    }

    private String generateCorrelations(UUID childId) {
        LocalDate cutoff = LocalDate.now().minusDays(30);

        String moods = buildMoodSummary(childId, cutoff);
        String sleeps = buildSleepSummary(childId, cutoff);
        String abcs = buildAbcSummary(childId, cutoff);
        String milestones = buildMilestoneSummary(childId, cutoff);
        String notes = buildNotesSummary(childId, cutoff);
        String screenings = buildScreeningSummary(childId);

        String prompt = """
                Sen otizm alaninda uzman bir klinik analist yapay zekasisin. Asagida otizmli bir cocugun son 30 gunluk verilerini bulacaksin.

                GOREV: Bu verileri butuncul bir bakisla analiz et. Ozellikle:
                - Uyku kalitesi ile ruh hali/davranis arasindaki korelasyonlara bak
                - Tekrarlayan davranis tetikleyicilerini (ABC kayitlarindan) tespit et
                - Gelisim alanlarini ve guclu yonleri vurgula
                - Ebeveyne somut, uygulanabilir oneriler ver

                FORMAT: Yaniti Turkce, empatik ve anlasilir bir dille yaz. Su basliklari kullan:
                **Genel Degerlendirme** (1-2 cumle ozet)
                **Dikkat Ceken Baglantilar** (2-3 madde)
                **Guclu Yonler** (1-2 madde)
                **Pratik Oneriler** (2-3 somut adim)

                """ + buildDataBlock(moods, sleeps, abcs, milestones, notes, screenings);

        return geminiService.sendMessage(prompt, null, "Genel Korelasyon Analizi");
    }

    private String generateBehavioralAnalysis(UUID childId) {
        LocalDate cutoff = LocalDate.now().minusDays(60);

        List<ABCEntry> abcEntries = abcRepo.findByChildIdOrderByEntryDateDescEntryTimeDescCreatedAtDesc(childId)
                .stream()
                .filter(a -> a.getEntryDate().isAfter(cutoff))
                .collect(Collectors.toList());

        if (abcEntries.isEmpty()) {
            return "Davranis analizi icin yeterli ABC verisi bulunamadi. Lutfen davranis gunlugunden kayit girmeye baslayiniz.";
        }

        Map<String, Long> categoryFreq = abcEntries.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getCategory() != null ? a.getCategory() : "Kategorisiz",
                        Collectors.counting()
                ));

        Map<String, Double> categoryAvgIntensity = abcEntries.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getCategory() != null ? a.getCategory() : "Kategorisiz",
                        Collectors.averagingInt(ABCEntry::getIntensity)
                ));

        String categoryStats = categoryFreq.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .map(e -> String.format("  - %s: %d kez (ortalama yogunluk: %.1f/5)",
                        e.getKey(), e.getValue(),
                        categoryAvgIntensity.getOrDefault(e.getKey(), 0.0)))
                .collect(Collectors.joining("\n"));

        String highIntensity = abcEntries.stream()
                .filter(a -> a.getIntensity() >= 4)
                .map(a -> String.format("  %s [%s]: %s → %s → %s",
                        a.getEntryDate(), a.getCategory() != null ? a.getCategory() : "-",
                        a.getAntecedent(), a.getBehavior(), a.getConsequence()))
                .limit(8)
                .collect(Collectors.joining("\n"));

        String allAbcs = abcEntries.stream()
                .limit(20)
                .map(a -> String.format("  %s %s | Oncesi: %s | Davranis: %s | Sonrasi: %s | Yer: %s | Yogunluk: %d/5",
                        a.getEntryDate(),
                        a.getEntryTime() != null ? a.getEntryTime().toString().substring(0, 5) : "",
                        a.getAntecedent(), a.getBehavior(), a.getConsequence(),
                        a.getLocation() != null ? a.getLocation() : "-",
                        a.getIntensity()))
                .collect(Collectors.joining("\n"));

        String prompt = """
                Sen otizm alaninda uzman bir davranis analisti yapay zekasisin (ABA/PBS deneyimi var).
                Asagida otizmli bir cocugun son 60 gunluk ABC (Antecedent-Behavior-Consequence) kayitlari var.

                GOREV: Bu verileri derinlemesine analiz et:
                1. Tetikleyici kaliplari (nerede, ne zaman, hangi durumlarda davranis cikiyor)
                2. Davranis islevleri (dikkat kazanma, kacma/kacınma, duyusal, somut nesne elde etme)
                3. En etkili mudahale stratejileri (consequence'lardan ne isledi, ne islemiyor)
                4. Onleyici stratejiler icin somut oneriler

                KATEGORI ISTATISTIKLERI (son 60 gun):
                """ + categoryStats + """

                YUKSEK YOGUNLUKLU OLAYLAR (yogunluk >= 4/5):
                """ + (highIntensity.isEmpty() ? "  Yok" : highIntensity) + """

                TUM ABC KAYITLARI (son 60 gun, max 20 kayit):
                """ + allAbcs + """

                FORMAT: Turkce, uzman ama anlasilir dil. Basliklar:
                **Tespit Edilen Tetikleyici Kaliplari**
                **Tahmin Edilen Davranis Islevleri**
                **Isleyen Mudahale Stratejileri**
                **Onleyici Yaklasim Onerileri**
                **Dikkat Edilmesi Gereken Noktalar**
                """;

        return geminiService.sendMessage(prompt, null, "Davranis Oreuntu Analizi");
    }

    private String generateProgressReport(UUID childId) {
        List<Milestone> milestones = milestoneRepo.findByChildIdOrderByAchievedDateDesc(childId);
        List<DevelopmentNote> notes = noteRepo.findByChildId(childId);
        List<ScreeningResult> screenings = screeningRepo.findByChildIdOrderByCreatedAtDesc(childId);

        Map<String, Long> milestoneByCategory = milestones.stream()
                .collect(Collectors.groupingBy(
                        m -> m.getCategory() != null ? m.getCategory() : "Genel",
                        Collectors.counting()
                ));

        String milestoneSummary = milestones.stream()
                .limit(15)
                .map(m -> String.format("  %s | %s | %s",
                        m.getAchievedDate(),
                        m.getCategory() != null ? m.getCategory() : "Genel",
                        m.getTitle()))
                .collect(Collectors.joining("\n"));

        String categoryBreakdown = milestoneByCategory.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .map(e -> String.format("  - %s: %d kilometre tasi", e.getKey(), e.getValue()))
                .collect(Collectors.joining("\n"));

        String notesSummary = notes.stream()
                .sorted(Comparator.comparing(DevelopmentNote::getNoteDate).reversed())
                .limit(10)
                .map(n -> String.format("  %s [%s]: %s",
                        n.getNoteDate(),
                        n.getCategory() != null ? n.getCategory() : "Genel",
                        n.getTitle() + (n.getContent() != null ? " - " + n.getContent().substring(0, Math.min(100, n.getContent().length())) : "")))
                .collect(Collectors.joining("\n"));

        String screeningSummary = screenings.stream()
                .limit(5)
                .map(s -> String.format("  %s: Skor %d/20",
                        s.getCreatedAt() != null ? s.getCreatedAt().toLocalDate() : "Tarih yok",
                        s.getScore()))
                .collect(Collectors.joining("\n"));

        String prompt = """
                Sen cocuk gelisimi ve otizm alaninda uzmanlasmis bir klinisyen yapay zekasisin.
                Asagida otizmli bir cocugun tum zamanli gelisim verileri bulunmaktadir.

                GOREV: Kapsamli bir ilerleme raporu olustur:
                1. Alanlar bazinda gelisim durumu degerlendirmesi
                2. En cok ilerleme kaydedilen alanlar
                3. Odak gerektiren alanlar
                4. Tarama skor trendleri analizi (varsa)
                5. Bir sonraki adimlar icin yol haritasi

                KILOMETRE TASLARI - Kategori Dagilimi:
                """ + (categoryBreakdown.isEmpty() ? "  Kayit yok" : categoryBreakdown) + """

                SON KILOMETRE TASLARI:
                """ + (milestoneSummary.isEmpty() ? "  Kayit yok" : milestoneSummary) + """

                GELISIM NOTLARI (son 10):
                """ + (notesSummary.isEmpty() ? "  Kayit yok" : notesSummary) + """

                TARAMA SONUCLARI:
                """ + (screeningSummary.isEmpty() ? "  Kayit yok" : screeningSummary) + """

                FORMAT: Turkce, detayli ama umut verici bir ton. Basliklar:
                **Genel Ilerleme Ozeti**
                **Parlayan Alanlar** (en cok gelisim gosteren)
                **Gelisme Firsatlari** (destekleme gereken)
                **Tarama Analizi** (eger veri varsa)
                **Onlerilen Sonraki Adimlar**
                """;

        return geminiService.sendMessage(prompt, null, "Gelisim Ilerleme Raporu");
    }

    private String generateWeeklySummary(UUID childId) {
        LocalDate weekAgo = LocalDate.now().minusDays(7);

        String moods = buildMoodSummary(childId, weekAgo);
        String sleeps = buildSleepSummary(childId, weekAgo);
        String abcs = buildAbcSummary(childId, weekAgo);

        List<DevelopmentNote> recentNotes = noteRepo.findByChildId(childId).stream()
                .filter(n -> n.getNoteDate() != null && n.getNoteDate().isAfter(weekAgo))
                .collect(Collectors.toList());

        UUID parentId = getCurrentParentId();
        List<Appointment> recentAppointments = parentId != null
                ? appointmentRepo.findByParentIdOrderByAppointmentDateAscAppointmentTimeAsc(parentId).stream()
                    .filter(a -> a.getAppointmentDate() != null && !a.getAppointmentDate().isBefore(weekAgo))
                    .filter(a -> a.getChild() != null && a.getChild().getId().equals(childId))
                    .collect(Collectors.toList())
                : List.of();

        String appointmentSummary = recentAppointments.stream()
                .map(a -> String.format("  %s %s: %s (%s)",
                        a.getAppointmentDate(),
                        a.getAppointmentTime() != null ? a.getAppointmentTime().toString().substring(0, 5) : "",
                        a.getExpert() != null ? a.getExpert().getFullName() : "Uzman",
                        a.getStatus()))
                .collect(Collectors.joining("\n"));

        String notesSummary = recentNotes.stream()
                .map(n -> String.format("  %s [%s]: %s",
                        n.getNoteDate(),
                        n.getCategory() != null ? n.getCategory() : "Genel",
                        n.getTitle()))
                .collect(Collectors.joining("\n"));

        String prompt = """
                Sen otizm destek platformunun haftalik analiz asistanisin.
                Asagida otizmli bir cocugun bu haftaki (son 7 gun) verileri var.

                GOREV: Kisa, odakli ve umut verici bir haftalik ozet hazirla:
                - Bu haftaki genel gidis hakkinda 1-2 cumlelik degerlendirme
                - Dikkat ceken pozitif gelismeler
                - Zorlu anlar ve nasil yonetildigine dair gozlem
                - Gelecek hafta icin 1-2 hatirlatici oneri

                BU HAFTAKI VERILER:

                RUH HALI:
                """ + (moods.isEmpty() ? "  Kayit girilmemis" : moods) + """

                UYKU:
                """ + (sleeps.isEmpty() ? "  Kayit girilmemis" : sleeps) + """

                DAVRANIS KAYITLARI:
                """ + (abcs.isEmpty() ? "  Kayit girilmemis" : abcs) + """

                GELISIM NOTLARI:
                """ + (notesSummary.isEmpty() ? "  Kayit girilmemis" : notesSummary) + """

                RANDEVULAR:
                """ + (appointmentSummary.isEmpty() ? "  Bu hafta randevu yok" : appointmentSummary) + """

                FORMAT: Kisa, samimi, destekleyici ton. 200-300 kelime. Basliklar:
                **Bu Hafta Ozeti**
                **Iyi Giden Seyler**
                **Dikkat Gerektiren Anlar**
                **Gelecek Hafta Icin**
                """;

        return geminiService.sendMessage(prompt, null, "Haftalik Ozet");
    }

    // ── Uyku–Davranış Korelasyonu ──────────────────────────────────────────────

    private String generateSleepBehaviorCorrelation(UUID childId) {
        return geminiService.sendMessage(buildSleepBehaviorPrompt(childId, LocalDate.now().minusDays(60)), null, "Uyku-Davranis Korelasyonu");
    }

    private String buildSleepBehaviorPrompt(UUID childId, LocalDate cutoff) {
        List<SleepEntry> sleepEntries = sleepRepo.findByChildIdOrderBySleepDateDesc(childId).stream()
                .filter(s -> s.getSleepDate().isAfter(cutoff))
                .collect(Collectors.toList());

        List<ABCEntry> abcEntries = abcRepo.findByChildIdOrderByEntryDateDescEntryTimeDescCreatedAtDesc(childId).stream()
                .filter(a -> a.getEntryDate().isAfter(cutoff))
                .collect(Collectors.toList());

        // Gün bazında ortalama uyku süresi ve davranış yoğunluğunu eşleştir
        Map<LocalDate, Double> sleepByDay = new HashMap<>();
        for (SleepEntry s : sleepEntries) {
            if (s.getDurationMinutes() != null) {
                sleepByDay.merge(s.getSleepDate(), s.getDurationMinutes() / 60.0, Double::sum);
            }
        }
        Map<LocalDate, Double> behaviorByDay = new HashMap<>();
        for (ABCEntry a : abcEntries) {
            behaviorByDay.merge(a.getEntryDate(), (double) a.getIntensity(), (x, y) -> (x + y) / 2.0);
        }

        // Pearson korelasyon katsayısı (ortak günler için)
        List<LocalDate> commonDays = sleepByDay.keySet().stream()
                .filter(behaviorByDay::containsKey)
                .collect(Collectors.toList());

        String correlationLine = "Hesaplanamadi (yeterli ortak gun verisi yok).";
        if (commonDays.size() >= 3) {
            double[] x = commonDays.stream().mapToDouble(sleepByDay::get).toArray();
            double[] y = commonDays.stream().mapToDouble(behaviorByDay::get).toArray();
            double r = pearson(x, y);
            String direction = r < -0.3 ? "TERS korelasyon (uyku azalinca davranis yogunlugu ARTIYOR)" :
                               r >  0.3 ? "AYNI yonde korelasyon (uyku artinca davranis da artiyor — beklenmedik)" :
                                          "Zayif/belirsiz korelasyon";
            correlationLine = String.format("r = %.2f (%d ortak gun) — %s", r, commonDays.size(), direction);
        }

        String dayTable = commonDays.stream()
                .sorted()
                .map(d -> String.format("  %s | Uyku: %.1f saat | Davranis yogunlugu: %.1f/5",
                        d, sleepByDay.get(d), behaviorByDay.get(d)))
                .collect(Collectors.joining("\n"));

        return """
                Sen otizm alaninda uzman bir klinisyen yapay zekasisin.
                Asagida cocugun son 60 gunluk uyku ve davranis verileri ile hesaplanmis korelasyon bilgisi var.

                HESAPLANAN KORELASYON:
                """ + correlationLine + """

                GUN BAZLI VERI (uyku + davranis kaydi olan gunler):
                """ + (dayTable.isEmpty() ? "  Yeterli ortak gun yoktur." : dayTable) + """

                TUM UYKU KAYITLARI:
                """ + buildSleepSummary(childId, cutoff) + """

                TUM DAVRANIS (ABC) KAYITLARI:
                """ + buildAbcSummary(childId, cutoff) + """

                GOREV: Bu verileri yorumla ve ebeveyne pratik bilgi ver.

                FORMAT:
                **Korelasyon Bulgulari** (sayisal sonucu sade dille acikla)
                **Dikkati Ceken Gunler** (veri tablosundan 2-3 dikkat cekici gun)
                **Uyku Kalitesini Artirma Onerileri** (3 somut adim)
                **Davranis Yonetimi Icin Uyku Stratejileri**
                """;
    }

    private double pearson(double[] x, double[] y) {
        int n = x.length;
        double sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
        for (int i = 0; i < n; i++) {
            sumX  += x[i];
            sumY  += y[i];
            sumXY += x[i] * y[i];
            sumX2 += x[i] * x[i];
            sumY2 += y[i] * y[i];
        }
        double num = n * sumXY - sumX * sumY;
        double den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        return den == 0 ? 0 : num / den;
    }

    // ── Uzmana Gösterilecek Rapor ──────────────────────────────────────────────

    private String generateExpertReport(UUID childId) {
        return geminiService.sendMessage(buildExpertReportPrompt(childId), null, "Uzman Raporu");
    }

    private String buildExpertReportPrompt(UUID childId) {
        LocalDate cutoff30 = LocalDate.now().minusDays(30);
        LocalDate cutoff7  = LocalDate.now().minusDays(7);

        String moods     = buildMoodSummary(childId, cutoff30);
        String sleeps    = buildSleepSummary(childId, cutoff30);
        String abcs      = buildAbcSummary(childId, cutoff30);
        String milestones = buildMilestoneSummary(childId, cutoff30);
        String notes     = buildNotesSummary(childId, cutoff30);
        String screenings = buildScreeningSummary(childId);

        // Son hafta özeti — en güncel bilgi
        String weekMoods  = buildMoodSummary(childId, cutoff7);
        String weekSleeps = buildSleepSummary(childId, cutoff7);
        String weekAbcs   = buildAbcSummary(childId, cutoff7);

        return """
                Sen otizm destek platformunun klinik rapor asistanisin.
                Asagidaki verilere dayanarak bir klinisyene veya BEP ekibine sunulmak uzere
                kisa, yapilandirilmis ve mesleki bir ozet rapor hazirla.
                Raporun amaci: uzman, 5 dakikada cocugun son durumunu kavrayabilsin.

                == SON 7 GUN ==
                Ruh hali: """ + (weekMoods.isEmpty()  ? "kayit yok" : weekMoods) + """

                Uyku: """ + (weekSleeps.isEmpty() ? "kayit yok" : weekSleeps) + """

                Davranis: """ + (weekAbcs.isEmpty()   ? "kayit yok" : weekAbcs) + """

                == SON 30 GUN ==
                """ + buildDataBlock(moods, sleeps, abcs, milestones, notes, screenings) + """

                FORMAT (resmi, klinik ton — 300-400 kelime):
                **Referans Donemim:** [tarihleri yaz]
                **Genel Klinik Gorunum**
                **Ruh Hali ve Duyusal Duzenleme**
                **Uyku Profili**
                **Davranis Ozeti** (ABC bulgulari)
                **Gelisim Alanlari**
                **Bu Seans Icin Oncelikli Gundem Maddeleri** (2-3 madde)
                **Ebeveyn Oncelikleri / Sorulari**
                """;
    }

    // ── BEP Önerileri ─────────────────────────────────────────────────────────

    private String generateBepSuggestions(UUID childId) {
        return geminiService.sendMessage(buildBepSuggestionsPrompt(childId), null, "BEP Veri Onerileri");
    }

    private String buildBepSuggestionsPrompt(UUID childId) {
        List<Milestone> milestones = milestoneRepo.findByChildIdOrderByAchievedDateDesc(childId);
        List<DevelopmentNote> notes = noteRepo.findByChildId(childId);
        List<ScreeningResult> screenings = screeningRepo.findByChildIdOrderByCreatedAtDesc(childId);

        // Mevcut hedefler (GoalRepository userId gerektiriyor; childId ile tüm hedeflere bak)
        // findByChildIdAndUserId yerine basit findAll filtreleyerek kullanıyoruz
        String goalsSummary = goalRepo.findAll().stream()
                .filter(g -> g.getChildId().equals(childId))
                .map(g -> String.format("  [%s] %s — %s",
                        g.isActive() ? "aktif" : "tamamlandi",
                        g.getCategory() != null ? g.getCategory() : "Genel",
                        g.getTitle()))
                .collect(Collectors.joining("\n"));

        Map<String, Long> achievedByCategory = milestones.stream()
                .collect(Collectors.groupingBy(
                        m -> m.getCategory() != null ? m.getCategory() : "Genel",
                        Collectors.counting()
                ));

        String achievedSummary = achievedByCategory.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .map(e -> String.format("  %s: %d tamamlandi", e.getKey(), e.getValue()))
                .collect(Collectors.joining("\n"));

        String recentMilestones = milestones.stream()
                .limit(15)
                .map(m -> String.format("  %s [%s]: %s",
                        m.getAchievedDate() != null ? m.getAchievedDate() : "?",
                        m.getCategory() != null ? m.getCategory() : "Genel",
                        m.getTitle()))
                .collect(Collectors.joining("\n"));

        String latestScreening = screenings.stream().findFirst()
                .map(s -> String.format("Skor: %d/20 (%s)",
                        s.getScore(), s.getCreatedAt() != null ? s.getCreatedAt().toLocalDate() : "?"))
                .orElse("Tarama sonucu yok");

        String recentNotes = notes.stream()
                .sorted(Comparator.comparing(DevelopmentNote::getNoteDate).reversed())
                .limit(8)
                .map(n -> String.format("  %s [%s]: %s", n.getNoteDate(),
                        n.getCategory() != null ? n.getCategory() : "Genel", n.getTitle()))
                .collect(Collectors.joining("\n"));

        return """
                Sen Turkiye'de otizm/ozel egitim alaninda uzmanlasmis bir BEP (Bireylestirilmis Egitim Programi) danismani yapay zekasisin.
                Asagidaki cocugun mevcut veri profiline gore BEP icin somut hedef onerileri sun.

                NOT: Bu oneriler bir BEP ekibi toplantisina hazirlik amaclidir.
                Bir klinisyen veya ogretmen bu bilgileri baslangic noktasi olarak kullanmalidir.

                MEVCUT TARAMA SONUCU:
                """ + latestScreening + """

                TAMAMLANAN KILOMETRE TASLARI — ALAN DAGILIMI:
                """ + (achievedSummary.isEmpty() ? "  Kayit yok" : achievedSummary) + """

                SON TAMAMLANAN KILOMETRE TASLARI:
                """ + (recentMilestones.isEmpty() ? "  Kayit yok" : recentMilestones) + """

                MEVCUT HEDEFLER:
                """ + (goalsSummary.isEmpty() ? "  Kayit yok" : goalsSummary) + """

                SON GELISIM NOTLARI:
                """ + (recentNotes.isEmpty() ? "  Kayit yok" : recentNotes) + """

                GOREV: Bu verilerden yola cikarak BEP ekibine sunulmak uzere yapılandırılmıs hedef onerileri hazirla.
                Her oneri icin: Hedef alani, kisa vadeli hedef, uzun vadeli hedef ve olcum kriteri belirt.

                FORMAT:
                **Mevcut Duzey Ozeti** (guçlü yonler ve gelisme gerektirenler)
                **BEP Hedef Onerileri** (her alan icin alt madde):
                  - Dil ve Iletisim
                  - Sosyal Beceriler
                  - Bilis ve Akademik Hazirlik
                  - Oze Bakim / Bagimlilik Becerileri
                  - Duyusal / Motor Beceriler (gerekliyse)
                **Onceliklendirme** (hangi alan en acil, neden)
                **Aile Icin Ev Destek Onerileri** (2-3 somut faaliyet)
                """;
    }

    private String buildDailyCoachPrompt(UUID childId) {
        var child = childRepository.findById(childId)
                .orElseThrow(() -> new ResourceNotFoundException("Cocuk profili bulunamadi"));

        LocalDate today = LocalDate.now();

        String moodInfo = moodRepo.findByChildIdAndEntryDate(childId, today)
                .map(m -> "Girildi (Seviye: " + m.getMoodLevel() + "/5" +
                          (m.getNotes() != null && !m.getNotes().isBlank()
                              ? ", Not: " + m.getNotes().substring(0, Math.min(60, m.getNotes().length()))
                              : "") + ")")
                .orElse("Henuz girilmedi");

        String appointmentInfo = "Bilgi yok";
        if (child.getParent() != null) {
            List<Appointment> upcoming = appointmentRepo
                    .findByParentIdOrderByAppointmentDateAscAppointmentTimeAsc(child.getParent().getId())
                    .stream()
                    .filter(a -> !a.getAppointmentDate().isBefore(today) &&
                                 a.getAppointmentDate().isBefore(today.plusDays(7)) &&
                                 !"CANCELLED".equals(a.getStatus()))
                    .limit(3)
                    .collect(Collectors.toList());
            appointmentInfo = upcoming.isEmpty() ? "Yaklasan randevu yok (7 gun)" :
                    upcoming.stream()
                            .map(a -> a.getAppointmentDate() + " - " +
                                      (a.getExpert() != null ? a.getExpert().getFullName() : "Uzman") +
                                      " (" + a.getStatus() + ")")
                            .collect(Collectors.joining(", "));
        }

        String recentNotes = noteRepo.findByChildId(childId).stream()
                .sorted(Comparator.comparing(DevelopmentNote::getNoteDate).reversed())
                .limit(3)
                .map(n -> n.getNoteDate() + ": " + n.getTitle())
                .collect(Collectors.joining("; "));

        return """
                Sen destekleyici bir otizm aile kocu yapay zekasisin.
                Asagida bir ebeveynin BUGUN icin ozet durumu verilmistir.

                Cocuk adi: %s
                Terapiler/Destek alanlari: %s
                Bugunun ruh hali kaydi: %s
                Yaklasan randevular (7 gun): %s
                Son gozlem notlari: %s

                GOREV: Bu ebeveyni bugun icin yonlendir. Kurallara uy:
                - Ruh hali kaydi girilmemisse oncelikle onu hatirlat
                - Yaklasan randevu varsa kisa bir hazirlik veya hatirlatma yap
                - Terapilere gore evde uygulanabilir kisa 1 aktivite oner
                - Empatic, destekleyici ve KISA ol (en fazla 2-3 cumle, baslık veya madde isareti kullanma)
                - Tibbi tavsiye verme
                - Turkce ve samimi bir dilde yaz
                """.formatted(
                    child.getName(),
                    child.getTherapies() != null && !child.getTherapies().isBlank()
                            ? child.getTherapies() : "Belirtilmemis",
                    moodInfo,
                    appointmentInfo,
                    recentNotes.isEmpty() ? "Kayit yok" : recentNotes
                );
    }

    /**
     * Çocuğun sağlık ve davranış verisi bu noktadan sonra yurt dışındaki yapay
     * zekâ sağlayıcısına gönderilir. KVKK md. 6 uyarınca özel nitelikli kişisel
     * verinin işlenmesi ve md. 9 uyarınca yurt dışına aktarılması açık rızaya
     * bağlıdır; rıza velinindir, isteği yapan uzmanın ya da yöneticinin değil.
     */
    private void requireAiConsent(UUID childId) {
        UUID parentId = childRepository.findById(childId)
                .map(child -> child.getParent().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Cocuk profili bulunamadi"));
        consentService.requireConsent(parentId, ConsentType.AI_ANALIZ,
                "Yapay zekâ analizi için veli açık rızası bulunmuyor. Ayarlar > Gizlilik ve Rızalar "
                        + "bölümünden yapay zekâ analizi rızası verilmeden bu özellik kullanılamaz.");
    }

    private void validateChildAccess(UUID childId, UUID requesterId, String requesterRole) {
        if (requesterId == null) {
            throw new UnauthorizedException("Oturum bilgisi bulunamadi");
        }
        if ("ADMIN".equals(requesterRole)) {
            if (!childRepository.existsById(childId)) {
                throw new ResourceNotFoundException("Cocuk profili bulunamadi");
            }
            return;
        }
        if (!childRepository.existsByIdAndParentId(childId, requesterId)) {
            throw new UnauthorizedException("Bu cocuk profiline erisim yetkiniz yok");
        }
    }

    private String buildMoodSummary(UUID childId, LocalDate cutoff) {
        return moodRepo.findByChildIdOrderByEntryDateDesc(childId).stream()
                .filter(m -> m.getEntryDate().isAfter(cutoff))
                .map(m -> String.format("  %s: Seviye %d/5%s",
                        m.getEntryDate(), m.getMoodLevel(),
                        m.getNotes() != null && !m.getNotes().isBlank() ? " - " + m.getNotes() : ""))
                .collect(Collectors.joining("\n"));
    }

    private String buildSleepSummary(UUID childId, LocalDate cutoff) {
        return sleepRepo.findByChildIdOrderBySleepDateDesc(childId).stream()
                .filter(s -> s.getSleepDate().isAfter(cutoff))
                .map(s -> String.format("  %s: %s%s",
                        s.getSleepDate(),
                        s.getDurationMinutes() != null
                                ? String.format("%.1f saat (kalite: %s/5)",
                                    s.getDurationMinutes() / 60.0,
                                    s.getQuality() != null ? s.getQuality() : "?")
                                : "Sure belirtilmemis",
                        s.getNotes() != null && !s.getNotes().isBlank() ? " - " + s.getNotes() : ""))
                .collect(Collectors.joining("\n"));
    }

    private String buildAbcSummary(UUID childId, LocalDate cutoff) {
        return abcRepo.findByChildIdOrderByEntryDateDescEntryTimeDescCreatedAtDesc(childId).stream()
                .filter(a -> a.getEntryDate().isAfter(cutoff))
                .map(a -> String.format("  %s [%s] Yogunluk:%d/5 | Oncesi: %s | Davranis: %s | Sonrasi: %s",
                        a.getEntryDate(),
                        a.getCategory() != null ? a.getCategory() : "Genel",
                        a.getIntensity(),
                        a.getAntecedent(), a.getBehavior(), a.getConsequence()))
                .collect(Collectors.joining("\n"));
    }

    private String buildMilestoneSummary(UUID childId, LocalDate cutoff) {
        return milestoneRepo.findByChildIdOrderByAchievedDateDesc(childId).stream()
                .filter(m -> m.getAchievedDate() != null && m.getAchievedDate().isAfter(cutoff))
                .map(m -> String.format("  %s [%s]: %s",
                        m.getAchievedDate(),
                        m.getCategory() != null ? m.getCategory() : "Genel",
                        m.getTitle()))
                .collect(Collectors.joining("\n"));
    }

    private String buildNotesSummary(UUID childId, LocalDate cutoff) {
        return noteRepo.findByChildId(childId).stream()
                .filter(n -> n.getNoteDate() != null && n.getNoteDate().isAfter(cutoff))
                .sorted(Comparator.comparing(DevelopmentNote::getNoteDate).reversed())
                .limit(10)
                .map(n -> String.format("  %s [%s]: %s",
                        n.getNoteDate(),
                        n.getCategory() != null ? n.getCategory() : "Genel",
                        n.getTitle()))
                .collect(Collectors.joining("\n"));
    }

    private String buildScreeningSummary(UUID childId) {
        return screeningRepo.findByChildIdOrderByCreatedAtDesc(childId).stream()
                .limit(6)
                .map(s -> String.format("  %s: Skor %d/20",
                        s.getCreatedAt() != null ? s.getCreatedAt().toLocalDate() : "?",
                        s.getScore()))
                .collect(Collectors.joining("\n"));
    }

    private String buildDataBlock(String moods, String sleeps, String abcs,
                                   String milestones, String notes, String screenings) {
        return "RUH HALI KAYITLARI:\n" + (moods.isEmpty() ? "  Kayit yok" : moods) + "\n\n" +
               "UYKU KAYITLARI:\n" + (sleeps.isEmpty() ? "  Kayit yok" : sleeps) + "\n\n" +
               "DAVRANIS (ABC) KAYITLARI:\n" + (abcs.isEmpty() ? "  Kayit yok" : abcs) + "\n\n" +
               "KILOMETRE TASLARI:\n" + (milestones.isEmpty() ? "  Kayit yok" : milestones) + "\n\n" +
               "GELISIM NOTLARI:\n" + (notes.isEmpty() ? "  Kayit yok" : notes) + "\n\n" +
               "TARAMA SONUCLARI:\n" + (screenings.isEmpty() ? "  Kayit yok" : screenings);
    }

    private UUID getCurrentParentId() {
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof UserPrincipal up) {
                return up.getId();
            }
        } catch (Exception ignored) {}
        return null;
    }
}
