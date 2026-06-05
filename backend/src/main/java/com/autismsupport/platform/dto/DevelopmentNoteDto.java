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
public class DevelopmentNoteDto {
    private UUID id;

    @NotBlank(message = "Baslik zorunludur")
    private String title;

    private String content;
    private String category;
    private String mood;
    private LocalDate noteDate;
    private UUID childId;
    private LocalDateTime createdAt;
}
