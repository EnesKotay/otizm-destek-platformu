package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.AnalyticsTrendDto;
import com.autismsupport.platform.exception.UnauthorizedException;
import com.autismsupport.platform.model.ABCEntry;
import com.autismsupport.platform.model.Milestone;
import com.autismsupport.platform.model.MoodEntry;
import com.autismsupport.platform.model.SleepEntry;
import com.autismsupport.platform.repository.ABCEntryRepository;
import com.autismsupport.platform.repository.MilestoneRepository;
import com.autismsupport.platform.repository.MoodEntryRepository;
import com.autismsupport.platform.repository.SleepEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final MilestoneRepository milestoneRepository;
    private final MoodEntryRepository moodEntryRepository;
    private final SleepEntryRepository sleepEntryRepository;
    private final ABCEntryRepository abcEntryRepository;
    private final PatientAccessService patientAccessService;

    public AnalyticsTrendDto getChildTrends(UUID childId, int months, UUID userId, String role) {
        validateChildAccess(childId, userId, role);
        LocalDate startDate = LocalDate.now().minusMonths(months).withDayOfMonth(1);

        List<Milestone> milestones = milestoneRepository.findByChildIdOrderByAchievedDateDesc(childId);
        List<MoodEntry> moods = moodEntryRepository.findByChildIdAndEntryDateBetweenOrderByEntryDateAsc(childId, startDate, LocalDate.now());
        List<SleepEntry> sleeps = sleepEntryRepository.findByChildIdAndSleepDateBetweenOrderBySleepDateAsc(childId, startDate, LocalDate.now());
        List<ABCEntry> abcs = abcEntryRepository.findByChildIdOrderByEntryDateDescEntryTimeDescCreatedAtDesc(childId);

        return AnalyticsTrendDto.builder()
                .milestoneTrends(calculateMilestoneTrends(milestones, months))
                .moodTrends(calculateMoodTrends(moods, months))
                .sleepTrends(calculateSleepTrends(sleeps, months))
                .behaviorTrends(calculateABCTrends(abcs, months))
                .build();
    }

    private void validateChildAccess(UUID childId, UUID userId, String role) {
        if (!patientAccessService.canReadChild(userId, role, childId)) {
            throw new UnauthorizedException("Bu cocuk profiline erisim yetkiniz yok");
        }
    }

    private List<Map<String, Object>> calculateMilestoneTrends(List<Milestone> milestones, int months) {
        Map<YearMonth, Long> counts = milestones.stream()
                .filter(m -> m.getAchievedDate() != null)
                .collect(Collectors.groupingBy(
                        m -> YearMonth.from(m.getAchievedDate()),
                        Collectors.counting()
                ));
        return formatTrendsMap(counts, months, "count", 0L);
    }

    private List<Map<String, Object>> calculateMoodTrends(List<MoodEntry> moods, int months) {
        Map<YearMonth, Double> averages = moods.stream()
                .filter(m -> m.getEntryDate() != null)
                .collect(Collectors.groupingBy(
                        m -> YearMonth.from(m.getEntryDate()),
                        Collectors.averagingInt(MoodEntry::getMoodLevel)
                ));
        return formatTrendsMap(averages, months, "avgLevel", 0.0);
    }

    private List<Map<String, Object>> calculateSleepTrends(List<SleepEntry> sleeps, int months) {
        Map<YearMonth, Double> averages = sleeps.stream()
                .filter(s -> s.getSleepDate() != null && s.getDurationMinutes() != null)
                .collect(Collectors.groupingBy(
                        s -> YearMonth.from(s.getSleepDate()),
                        Collectors.averagingInt(SleepEntry::getDurationMinutes)
                ));
        return formatTrendsMap(averages, months, "avgDuration", 0.0);
    }

    private List<Map<String, Object>> calculateABCTrends(List<ABCEntry> abcs, int months) {
        LocalDate startDate = LocalDate.now().minusMonths(months).withDayOfMonth(1);
        Map<YearMonth, Long> counts = abcs.stream()
                .filter(a -> a.getEntryDate() != null && !a.getEntryDate().isBefore(startDate))
                .collect(Collectors.groupingBy(
                        a -> YearMonth.from(a.getEntryDate()),
                        Collectors.counting()
                ));
        return formatTrendsMap(counts, months, "count", 0L);
    }

    private <T> List<Map<String, Object>> formatTrendsMap(Map<YearMonth, T> dataMap, int months, String valueKey, T defaultValue) {
        List<Map<String, Object>> result = new ArrayList<>();
        YearMonth current = YearMonth.now().minusMonths(months - 1);
        for (int i = 0; i < months; i++) {
            Map<String, Object> map = new HashMap<>();
            map.put("month", current.toString()); // e.g. "2024-01"
            map.put(valueKey, dataMap.getOrDefault(current, defaultValue));
            result.add(map);
            current = current.plusMonths(1);
        }
        return result;
    }
}
