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
public class GroupMeetingDto {
    private UUID id;
    private UUID groupId;

    @NotBlank(message = "Toplantı başlığı zorunludur")
    private String title;

    private String description;
    private String meetingUrl;

    @NotNull(message = "Başlangıç zamanı zorunludur")
    private LocalDateTime startTime;

    private LocalDateTime endTime;
    private LocalDateTime createdAt;
}
