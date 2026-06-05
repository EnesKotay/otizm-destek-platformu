package com.autismsupport.platform.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data @AllArgsConstructor @NoArgsConstructor @Builder
public class MoodEntryDto {
    private UUID id;
    @NotNull private UUID childId;
    private LocalDate entryDate;
    @Min(1) @Max(5) private int moodLevel;
    private String notes;
    private List<String> triggers;
    private LocalDateTime createdAt;
}
