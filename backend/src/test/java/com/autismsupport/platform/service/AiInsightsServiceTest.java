package com.autismsupport.platform.service;

import com.autismsupport.platform.repository.ABCEntryRepository;
import com.autismsupport.platform.repository.MilestoneRepository;
import com.autismsupport.platform.repository.MoodEntryRepository;
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

    @InjectMocks AiInsightsService aiInsightsService;

    @Test
    @DisplayName("generateCorrelations: veri yokken boş bölümleri prompt'a ekler ve Gemini yanıtını döner")
    void generateCorrelations_withNoEntries_returnsGeminiResponse() {
        UUID childId = UUID.randomUUID();
        when(moodRepo.findByChildIdOrderByEntryDateDesc(childId)).thenReturn(List.of());
        when(sleepRepo.findByChildIdOrderBySleepDateDesc(childId)).thenReturn(List.of());
        when(abcRepo.findByChildIdOrderByEntryDateDescEntryTimeDescCreatedAtDesc(childId)).thenReturn(List.of());
        when(geminiService.sendMessage(
                org.mockito.ArgumentMatchers.anyString(),
                eq(null),
                eq("AI Korelasyon Analizi Gorevi")
        )).thenReturn("Hazir analiz");

        String result = aiInsightsService.generateCorrelations(childId);

        assertThat(result).isEqualTo("Hazir analiz");

        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);
        verify(geminiService).sendMessage(promptCaptor.capture(), eq(null), eq("AI Korelasyon Analizi Gorevi"));
        assertThat(promptCaptor.getValue())
                .contains("RUH HALI KAYITLARI:\nYok")
                .contains("UYKU KAYITLARI:\nYok")
                .contains("DAVRANIS (ABC) KAYITLARI:\nYok");
    }
}
