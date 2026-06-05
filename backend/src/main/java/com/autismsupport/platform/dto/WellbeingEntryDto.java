package com.autismsupport.platform.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data @AllArgsConstructor @NoArgsConstructor @Builder
public class WellbeingEntryDto {
    private UUID id;
    private LocalDate entryDate;
    @NotNull @Size(min = 5, max = 5)
    private List<@Min(1) @Max(10) Integer> answers;
    @Min(0) @Max(100)
    private int score;
    private String notes;
    private LocalDateTime createdAt;
}
