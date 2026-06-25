package com.autismsupport.platform.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data @AllArgsConstructor @NoArgsConstructor @Builder
public class MedicationLogDto {
    private UUID id;
    private UUID medicationId;
    private UUID childId;
    private LocalDate logDate;
    private String scheduledTime;
    private boolean taken;
    private LocalDateTime takenAt;
    private String notes;
    private List<String> sideEffects;
    private LocalDateTime createdAt;
}
