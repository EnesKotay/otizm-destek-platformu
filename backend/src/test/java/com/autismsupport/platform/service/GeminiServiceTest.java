package com.autismsupport.platform.service;

import com.autismsupport.platform.exception.ValidationException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

class GeminiServiceTest {
    @Test
    void missingApiKeyIsReportedInsteadOfReturningFakeAiContent() {
        PlatformSettingsService settings = mock(PlatformSettingsService.class);
        GeminiService service = new GeminiService(new ObjectMapper(), settings);
        ReflectionTestUtils.setField(service, "apiKey", "");

        assertThatThrownBy(() -> service.sendMessage("Merhaba", List.of(), null))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("GEMINI_API_KEY");
    }
}
