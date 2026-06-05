package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PatientNoteDto {
    private UUID id;
    private UUID expertId;
    private UUID parentId;
    private String parentName;
    private UUID childId;
    private String childName;

    @NotBlank(message = "Not içeriği zorunludur")
    @Size(max = 5000)
    private String content;

    private String category;

    @NotNull(message = "Not tarihi zorunludur")
    private LocalDate noteDate;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
