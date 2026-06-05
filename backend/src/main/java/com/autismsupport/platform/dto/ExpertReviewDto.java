package com.autismsupport.platform.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ExpertReviewDto {
    private UUID id;
    private UUID expertId;
    private UUID reviewerId;
    private String reviewerName;
    private String reviewerImageUrl;
    private int rating;
    private String comment;
    private LocalDateTime createdAt;
}
