package com.autismsupport.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ExpertConsultationDto {
    private UUID id;
    private UUID authorId;
    private String authorName;
    private String authorTitle;
    private String authorImageUrl;
    private String title;
    private String description;
    private List<String> tags;
    private String status;
    private int replyCount;
    private LocalDateTime createdAt;
    private List<ExpertConsultationReplyDto> replies;
}
