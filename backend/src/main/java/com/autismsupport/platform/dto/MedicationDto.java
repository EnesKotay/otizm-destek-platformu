package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data @AllArgsConstructor @NoArgsConstructor @Builder
public class MedicationDto {
    private UUID id;
    @NotNull private UUID childId;
    @NotBlank private String name;
    private String dosage;
    private String unit;
    private String frequency;
    private List<String> scheduledTimes;
    private String notes;
    private boolean isActive;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDateTime createdAt;
    private List<MedicationLogDto> todayLogs;
}
