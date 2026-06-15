package com.autismsupport.platform.dto;

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
public class ExpertConsultationReplyDto {
    private UUID id;
    private UUID consultationId;
    private UUID authorId;
    private String authorName;
    private String authorTitle;
    private String authorImageUrl;
    private String content;
    private LocalDateTime createdAt;
}
