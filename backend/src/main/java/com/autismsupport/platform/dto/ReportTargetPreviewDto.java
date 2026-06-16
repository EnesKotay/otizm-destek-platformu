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
public class ReportTargetPreviewDto {
    private String targetType;
    private UUID targetId;
    private boolean available;
    private String title;
    private String content;
    private UUID authorId;
    private String authorName;
    private String authorEmail;
    private LocalDateTime createdAt;
}
