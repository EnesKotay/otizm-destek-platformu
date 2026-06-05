package com.autismsupport.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoutineItemDto {
    private UUID id;
    private UUID routineId;
    private String title;
    private String description;
    private String scheduledTime;   // "HH:mm" string formati (frontend uyumu icin)
    private String iconName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
