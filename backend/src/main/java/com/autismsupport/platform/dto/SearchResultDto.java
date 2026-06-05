package com.autismsupport.platform.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SearchResultDto {
    private UUID id;
    private String type; // POST, ARTICLE, GROUP, EXPERT
    private String title;
    private String excerpt;
    private LocalDateTime createdAt;
    private double rank;
}
