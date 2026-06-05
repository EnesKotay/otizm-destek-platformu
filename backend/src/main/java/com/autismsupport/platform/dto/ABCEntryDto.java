package com.autismsupport.platform.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Data @AllArgsConstructor @NoArgsConstructor @Builder
public class ABCEntryDto {
    private UUID id;
    @NotNull private UUID childId;
    private LocalDate entryDate;
    private LocalTime entryTime;
    @NotBlank private String antecedent;
    @NotBlank private String behavior;
    @NotBlank private String consequence;
    @Min(1) @Max(5) private int intensity;
    private String category;
    private String location;
    private String notes;
    private LocalDateTime createdAt;
}
