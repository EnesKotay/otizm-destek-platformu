package com.autismsupport.platform.service;

import com.autismsupport.platform.repository.ABCEntryRepository;
import com.autismsupport.platform.repository.AppointmentRepository;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.DevelopmentNoteRepository;
import com.autismsupport.platform.repository.GoalRepository;
import com.autismsupport.platform.repository.MilestoneRepository;
import com.autismsupport.platform.repository.MoodEntryRepository;
import com.autismsupport.platform.repository.ScreeningResultRepository;
import com.autismsupport.platform.repository.SleepEntryRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AiInsightsService unit testleri")
class AiInsightsServiceTest {

    @Mock GeminiService geminiService;
    @Mock MoodEntryRepository moodRepo;
    @Mock SleepEntryRepository sleepRepo;
    @Mock ABCEntryRepository abcRepo;
    @Mock MilestoneRepository milestoneRepo;
    @Mock ChildRepository childRepository;
    @Mock DevelopmentNoteRepository noteRepo;
    @Mock ScreeningResultRepository screeningRepo;
    @Mock AppointmentRepository appointmentRepo;
    @Mock GoalRepository goalRepo;

    @InjectMocks AiInsightsService aiInsightsService;

    @Test
    @DisplayName("generateCorrelations: veri yokken boş bölümleri prompt'a ekler ve Gemini yanıtını döner")
    void generateCorrelations_withNoEntries_returnsGeminiResponse() {
        UUID childId = UUID.randomUUID();
        UUID parentId = UUID.randomUUID();
        when(childRepository.existsByIdAndParentId(childId, parentId)).thenReturn(true);
        when(moodRepo.findByChildIdOrderByEntryDateDesc(childId)).thenReturn(List.of());
        when(sleepRepo.findByChildIdOrderBySleepDateDesc(childId)).thenReturn(List.of());
        when(abcRepo.findByChildIdOrderByEntryDateDescEntryTimeDescCreatedAtDesc(childId)).thenReturn(List.of());
        when(milestoneRepo.findByChildIdOrderByAchievedDateDesc(childId)).thenReturn(List.of());
        when(noteRepo.findByChildId(childId)).thenReturn(List.of());
        when(screeningRepo.findByChildIdOrderByCreatedAtDesc(childId)).thenReturn(List.of());
        when(geminiService.sendMessage(
                org.mockito.ArgumentMatchers.anyString(),
                eq(null),
                eq("Genel Korelasyon Analizi")
        )).thenReturn("Hazir analiz");

        String result = aiInsightsService.generateInsights(
                childId,
                AiInsightsService.AnalysisType.GENERAL,
                parentId,
                "PARENT");

        assertThat(result).isEqualTo("Hazir analiz");

        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);
        verify(geminiService).sendMessage(promptCaptor.capture(), eq(null), eq("Genel Korelasyon Analizi"));
        assertThat(promptCaptor.getValue())
                .contains("RUH HALI KAYITLARI:\n  Kayit yok")
                .contains("UYKU KAYITLARI:\n  Kayit yok")
                .contains("DAVRANIS (ABC) KAYITLARI:\n  Kayit yok");
    }
}
