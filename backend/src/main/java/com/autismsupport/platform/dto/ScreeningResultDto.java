package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ScreeningResultDto {
    private UUID id;

    @NotNull(message = "Cocuk ID zorunludur")
    private UUID childId;

    private String childName;

    @NotBlank(message = "Test tipi zorunludur")
    private String testType;

    private int score;
    private String riskLevel;
    private Map<String, Boolean> answers;
    private LocalDateTime createdAt;
}
