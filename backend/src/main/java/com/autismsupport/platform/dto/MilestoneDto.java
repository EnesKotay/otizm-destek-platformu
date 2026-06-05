package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MilestoneDto {
    private UUID id;

    @NotBlank(message = "Baslik zorunludur")
    private String title;

    private String description;
    private String category;
    private LocalDate achievedDate;
    private UUID childId;
    private LocalDateTime createdAt;
}
