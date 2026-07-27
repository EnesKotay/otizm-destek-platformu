package com.autismsupport.platform.controller;

import com.autismsupport.platform.config.RateLimit;
import com.autismsupport.platform.dto.ChatbotRequest;
import com.autismsupport.platform.dto.ChatbotResponse;
import com.autismsupport.platform.model.*;
import com.autismsupport.platform.repository.*;
import com.autismsupport.platform.service.ChatbotService;
import com.autismsupport.platform.service.ConsentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
@Slf4j
public class ChatbotController {

    private final ChatbotService chatbotService;
    private final ConsentService consentService;
    private final UserRepository userRepository;
    private final ChildRepository childRepository;
    private final DevelopmentNoteRepository developmentNoteRepository;
    private final MilestoneRepository milestoneRepository;
    private final MoodEntryRepository moodEntryRepository;
    private final RoutineRepository routineRepository;
    private final ABCEntryRepository abcEntryRepository;
    private final SleepEntryRepository sleepEntryRepository;

    /* ─── Normal (non-streaming) endpoint ─────────────────── */
    @RateLimit(limit = 20, duration = 60)
    @PostMapping("/message")
    public ResponseEntity<ChatbotResponse> sendMessage(
            @Valid @RequestBody ChatbotRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        String userId = userDetails.getUsername();
        log.debug("Chatbot istegi alindi - kullanici: {}", userId);

        String childContext = buildRichChildContext(userId, request.getPagePath());
        ChatbotResponse response = chatbotService.chat(
                request.getMessage(),
                request.getHistory(),
                userId,
                childContext
        );
        return ResponseEntity.ok(response);
    }

    /* ─── Streaming endpoint (SSE) ─────────────────────────── */
    @RateLimit(limit = 10, duration = 60)
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamMessage(
            @Valid @RequestBody ChatbotRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        String userId = userDetails.getUsername();
        log.debug("Chatbot stream istegi alindi - kullanici: {}", userId);

        String childContext = buildRichChildContext(userId, request.getPagePath());
        return chatbotService.streamChat(
                request.getMessage(),
                request.getHistory(),
                userId,
                childContext
        );
    }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }

    /* ─── Zengin cocuk baglami ─────────────────────────────── */
    @Transactional(readOnly = true)
    String buildRichChildContext(String email, String pagePath) {
        try {
            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) return null;

            StringBuilder sb = new StringBuilder();

            // Sayfa baglami
            if (pagePath != null && !pagePath.isBlank()) {
                sb.append("[Sistem baglami — kullaniciya gosterme]\n");
                sb.append("Kullanici su anda '").append(pagePath).append("' sayfasinda.\n\n");
            }

            // Çocuğun tanı, gelişim ve davranış verisi bu bağlamla birlikte yurt
            // dışındaki yapay zekâ sağlayıcısına gider. Veli açık rıza vermediyse
            // asistan çalışmaya devam eder ama çocuğa ait hiçbir veri aktarılmaz.
            if (!consentService.hasConsent(user.getId(), ConsentType.AI_ANALIZ)) {
                sb.append("[Sistem baglami — kullaniciya gosterme]\n")
                  .append("Kullanici yapay zeka analizi icin acik riza vermedigi icin cocuk ")
                  .append("bilgileri paylasilmadi. Kisiye ozel yorum yapma; genel bilgi ver ve ")
                  .append("gerekiyorsa Ayarlar > Gizlilik ve Rizalar bolumunden riza verebilecegini soyle.\n\n");
                return sb.toString();
            }

            List<Child> children = childRepository.findByParentId(user.getId());
            if (children.isEmpty()) return sb.isEmpty() ? null : sb.toString();

            for (Child c : children) {
                // Temel bilgiler
                sb.append("### Cocuk: ").append(c.getName()).append("\n");
                if (c.getBirthDate() != null) {
                    int age = LocalDate.now().getYear() - c.getBirthDate().getYear();
                    sb.append("- Yas: ").append(age).append("\n");
                }
                if (c.getDiagnosisInfo() != null) sb.append("- Tani: ").append(c.getDiagnosisInfo()).append("\n");
                if (c.getTherapies()     != null) sb.append("- Terapiler: ").append(c.getTherapies()).append("\n");

                UUID childId = c.getId();

                // Son 3 gelisim notu
                try {
                    List<DevelopmentNote> notes = developmentNoteRepository.findTop5ByChildIdOrderByCreatedAtDesc(childId);
                    if (!notes.isEmpty()) {
                        sb.append("- Son gelisim notlari:\n");
                        notes.forEach(n -> sb.append("  • [").append(n.getNoteDate()).append("] ")
                                .append(n.getTitle())
                                .append(n.getContent() != null ? ": " + n.getContent().substring(0, Math.min(n.getContent().length(), 100)) : "")
                                .append("\n"));
                    }
                } catch (Exception e) { log.debug("Gelisim notlari alinamadi: {}", e.getMessage()); }

                // Son 3 milestone
                try {
                    List<Milestone> milestones = milestoneRepository.findByChildIdOrderByAchievedDateDesc(childId)
                            .stream().limit(3).toList();
                    if (!milestones.isEmpty()) {
                        sb.append("- Son kazanimlar:\n");
                        milestones.forEach(m -> sb.append("  • [").append(m.getAchievedDate()).append("] ")
                                .append(m.getTitle()).append("\n"));
                    }
                } catch (Exception e) { log.debug("Milestone alinamadi: {}", e.getMessage()); }

                // Son 7 gunluk ruh hali ortalamasi
                try {
                    LocalDate weekAgo = LocalDate.now().minusDays(7);
                    List<MoodEntry> moods = moodEntryRepository
                            .findByChildIdAndEntryDateBetweenOrderByEntryDateAsc(childId, weekAgo, LocalDate.now());
                    if (!moods.isEmpty()) {
                        double avgMood = moods.stream().mapToInt(MoodEntry::getMoodLevel).average().orElse(0);
                        sb.append(String.format("- Son 7 gunluk ortalama ruh hali: %.1f/5\n", avgMood));
                    }
                } catch (Exception e) { log.debug("Ruh hali alinamadi: {}", e.getMessage()); }

                // Son 7 gunluk uyku verileri
                try {
                    LocalDate weekAgo = LocalDate.now().minusDays(7);
                    List<SleepEntry> sleepEntries = sleepEntryRepository
                            .findByChildIdAndSleepDateBetweenOrderBySleepDateAsc(childId, weekAgo, LocalDate.now());
                    if (!sleepEntries.isEmpty()) {
                        double avgSleep = sleepEntries.stream()
                                .filter(s -> s.getDurationMinutes() != null)
                                .mapToInt(SleepEntry::getDurationMinutes)
                                .average().orElse(0);
                        long poorSleepCount = sleepEntries.stream()
                                .filter(s -> s.getDurationMinutes() != null && s.getDurationMinutes() < 420)
                                .count();
                        sb.append(String.format("- Son 7 gunluk ortalama uyku: %.0f dakika (%.1f saat)\n",
                                avgSleep, avgSleep / 60));
                        if (poorSleepCount > 2) {
                            sb.append(String.format("  (Dikkat: %d gecede uyku suresi 7 saatin altinda)\n", poorSleepCount));
                        }
                        long wakingNights = sleepEntries.stream()
                                .filter(s -> s.getNightWakings() > 0)
                                .count();
                        if (wakingNights > 0) {
                            sb.append(String.format("  (%d gecede gece uyanmasi yasandi)\n", wakingNights));
                        }
                    }
                } catch (Exception e) { log.debug("Uyku verileri alinamadi: {}", e.getMessage()); }

                // Son 7 gunluk ABC davranis kayitlari
                try {
                    LocalDate weekAgo = LocalDate.now().minusDays(7);
                    List<ABCEntry> abcEntries = abcEntryRepository
                            .findByChildIdAndEntryDateBetweenOrderByEntryDateDesc(childId, weekAgo, LocalDate.now());
                    if (!abcEntries.isEmpty()) {
                        sb.append(String.format("- Son 7 gunde %d davranis kaydi:\n", abcEntries.size()));
                        abcEntries.stream().limit(3).forEach(a -> {
                            sb.append(String.format("  • [%s] Tetikleyici: %s | Davranis: %s | Sonuc: %s (Siddeti: %d/5)\n",
                                    a.getEntryDate(),
                                    truncate(a.getAntecedent(), 60),
                                    truncate(a.getBehavior(), 60),
                                    truncate(a.getConsequence(), 60),
                                    a.getIntensity()));
                        });
                        double avgIntensity = abcEntries.stream().mapToInt(ABCEntry::getIntensity).average().orElse(0);
                        if (avgIntensity > 3.5) {
                            sb.append(String.format("  (Bu hafta ortalama davranis siddeti yuksel: %.1f/5)\n", avgIntensity));
                        }
                    }
                } catch (Exception e) { log.debug("ABC kayitlari alinamadi: {}", e.getMessage()); }

                // Aktif rutinler
                try {
                    List<Routine> routines = routineRepository.findByChildIdAndIsActiveTrue(childId);
                    if (!routines.isEmpty()) {
                        sb.append("- Aktif rutinler: ")
                          .append(routines.stream().map(Routine::getName).collect(Collectors.joining(", ")))
                          .append("\n");
                    }
                } catch (Exception e) { log.debug("Rutin alinamadi: {}", e.getMessage()); }

                sb.append("\n");
            }

            return sb.toString();
        } catch (Exception e) {
            log.warn("Zengin cocuk baglami olusturulamadi: {}", e.getMessage());
            return null;
        }
    }
}
