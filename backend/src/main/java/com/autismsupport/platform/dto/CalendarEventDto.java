package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CalendarEventDto {
    private UUID id;

    @NotBlank(message = "Etkinlik basligi zorunludur")
    private String title;

    private String description;

    @NotBlank(message = "Etkinlik tipi zorunludur")
    private String eventType;

    @NotNull(message = "Baslangic zamani zorunludur")
    private LocalDateTime startTime;

    private LocalDateTime endTime;
    private String recurrenceRule;
    private boolean reminderEnabled;
    private String color;
    private UUID childId;
    private LocalDateTime createdAt;
}
