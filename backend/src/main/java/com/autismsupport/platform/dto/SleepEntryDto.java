package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data @AllArgsConstructor @NoArgsConstructor @Builder
public class SleepEntryDto {
    private UUID id;
    @NotNull private UUID childId;
    private LocalDate sleepDate;
    private String bedtime;
    private String wakeTime;
    private Integer durationMinutes;
    private Integer quality;
    private int nightWakings;
    private String notes;
    private LocalDateTime createdAt;
}
