package com.autismsupport.platform.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ArticleCommentDto {
    private UUID id;
    private String content;
    private UUID articleId;
    private UserDto author;
    private boolean isExperience;
    private String durationTried;
    private Integer effectivenessRating;
    private LocalDateTime createdAt;
}
