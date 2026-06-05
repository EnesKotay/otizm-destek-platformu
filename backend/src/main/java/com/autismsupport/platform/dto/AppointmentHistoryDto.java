package com.autismsupport.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AppointmentHistoryDto {
    private UUID id;
    private String oldStatus;
    private String newStatus;
    private UUID changedById;
    private String changedByName;
    private String note;
    private LocalDateTime changedAt;
}
