package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class BepReportDto {
    private UUID id;

    @NotNull(message = "Cocuk ID zorunludur")
    private UUID childId;

    @NotBlank(message = "Ogrenci adi zorunludur")
    private String studentName;

    private String diagnosis;
    private String performance;
    private List<Map<String, Object>> goals;
    private String schoolYear;
    private LocalDateTime sharedAt;
    private UUID createdById;
}
