package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ChildDto {
    private UUID id;

    @NotBlank(message = "Cocugun adi zorunludur")
    private String name;

    private LocalDate birthDate;
    private String diagnosisInfo;
    private String educationProgram;
    private String therapies;
    private Map<String, Object> privacySettings;
    private List<TagDto> tags;
    private Set<UUID> tagIds;
    private LocalDateTime createdAt;
}
