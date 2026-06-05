package com.autismsupport.platform.service;

import com.autismsupport.platform.repository.ABCEntryRepository;
import com.autismsupport.platform.repository.MilestoneRepository;
import com.autismsupport.platform.repository.MoodEntryRepository;
import com.autismsupport.platform.repository.SleepEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiInsightsService {

    private final GeminiService geminiService;
    private final MoodEntryRepository moodRepo;
    private final SleepEntryRepository sleepRepo;
    private final ABCEntryRepository abcRepo;
    private final MilestoneRepository milestoneRepo;

    public String generateCorrelations(UUID childId) {
        // Collect last 30 days of data
        LocalDate thirtyDaysAgo = LocalDate.now().minusDays(30);

        String moods = moodRepo.findByChildIdOrderByEntryDateDesc(childId).stream()
                .filter(m -> m.getEntryDate().isAfter(thirtyDaysAgo))
                .map(m -> m.getEntryDate() + ": Seviye " + m.getMoodLevel() + " - " + m.getNotes())
                .collect(Collectors.joining("\n"));

        String sleeps = sleepRepo.findByChildIdOrderBySleepDateDesc(childId).stream()
                .filter(s -> s.getSleepDate().isAfter(thirtyDaysAgo))
                .map(s -> s.getSleepDate() + ": " + (s.getDurationMinutes() != null ? s.getDurationMinutes() / 60.0 + " saat" : "") + " - " + s.getNotes())
                .collect(Collectors.joining("\n"));

        String abcs = abcRepo.findByChildIdOrderByEntryDateDescEntryTimeDescCreatedAtDesc(childId).stream()
                .filter(a -> a.getEntryDate().isAfter(thirtyDaysAgo))
                .map(a -> a.getEntryDate() + ": [Davranis] " + a.getBehavior() + " [Oncesi] " + a.getAntecedent() + " [Sonrasi] " + a.getConsequence())
                .collect(Collectors.joining("\n"));

        String prompt = "Asagidaki veriler otizmli bir cocugun son 30 gunluk kayitlaridir. Lutfen bu veriler arasindaki olasi korelasyonlari (ornegin az uyku ile kriz anlari arasindaki baglantilar, ruh halini etkileyen faktorler vb.) analiz et ve ebeveyne destekleyici ve pratik icgoruler sun.\n\n" +
                "RUH HALI KAYITLARI:\n" + (moods.isEmpty() ? "Yok" : moods) + "\n\n" +
                "UYKU KAYITLARI:\n" + (sleeps.isEmpty() ? "Yok" : sleeps) + "\n\n" +
                "DAVRANIS (ABC) KAYITLARI:\n" + (abcs.isEmpty() ? "Yok" : abcs) + "\n\n" +
                "Lutfen analizi okunakli, sefkatli bir dille ve 3-4 maddelik cikarimlar seklinde yap.";

        return geminiService.sendMessage(prompt, null, "AI Korelasyon Analizi Gorevi");
    }
}
