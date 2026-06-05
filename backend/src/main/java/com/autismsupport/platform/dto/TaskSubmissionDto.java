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
public class TaskSubmissionDto {
    private UUID id;
    private UUID taskId;
    private UUID parentId;
    private String parentNote;
    private String evidenceUrl;
    private String expertFeedback;
    private boolean expertReviewed;
    private LocalDateTime submittedAt;
    private LocalDateTime updatedAt;
}
