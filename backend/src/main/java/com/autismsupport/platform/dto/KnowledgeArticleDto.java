package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class KnowledgeArticleDto {
    private UUID id;
    @NotBlank private String title;
    @NotBlank private String content;
    private String category;
    private String summary;
    private String format;
    private String mediaUrl;
    private String sourceName;
    private String sourceUrl;
    private boolean pendingReview;
    private String sourceAuthor;
    private String sourcePublication;
    private LocalDate sourcePublishedAt;
    private LocalDate sourceAccessedAt;
    private String doi;
    private String licenseType;
    private String usageType;
    private String evidenceLevel;
    private String originalLanguage;
    private boolean aiGenerated;
    private UserDto reviewedBy;
    private LocalDateTime reviewedAt;
    private String reviewNotes;
    private boolean bookmarked;
    private java.util.Set<TagDto> tags;
    private UserDto author;
    private boolean published;
    private int viewCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
