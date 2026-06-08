package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data @AllArgsConstructor @NoArgsConstructor @Builder
public class CalendarEventDto {
    private UUID id;

    @NotBlank(message = "Etkinlik basligi zorunludur")
    @Size(max = 200, message = "Baslik en fazla 200 karakter olabilir")
    private String title;

    @Size(max = 2000, message = "Aciklama en fazla 2000 karakter olabilir")
    private String description;

    @NotBlank(message = "Etkinlik tipi zorunludur")
    private String eventType;

    @NotNull(message = "Baslangic zamani zorunludur")
    private LocalDateTime startTime;

    private LocalDateTime endTime;
    private String recurrenceRule;

    // Yeni alanlar
    private String status;   // PLANNED / COMPLETED / CANCELLED
    private String location;
    private Integer reminderMinutesBefore; // 15, 30, 60, 120, 1440 (1 gün), null = kapalı

    private String color;
    private UUID childId;
    private String childName;
    private LocalDateTime createdAt;
}
