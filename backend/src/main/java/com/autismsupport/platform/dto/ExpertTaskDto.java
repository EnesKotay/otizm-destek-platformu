package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpertTaskDto {
    private UUID id;
    private UUID expertId;
    private UUID parentId;
    private UUID childId;

    @NotBlank(message = "Gorev basligi zorunludur")
    private String title;

    private String description;
    private String category;
    private String difficulty;
    private String frequency;
    private String materialUrl;
    private LocalDate dueDate;
    private String status;
}
