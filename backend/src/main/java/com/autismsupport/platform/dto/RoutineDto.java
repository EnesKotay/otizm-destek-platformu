package com.autismsupport.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoutineDto {
    private UUID id;
    private UUID childId;
    private String name;
    private String description;
    private boolean isActive;
    private List<RoutineItemDto> items;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
