package com.autismsupport.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExpertAnalyticsDto {
    private long totalArticles;
    private long publishedArticles;
    private long totalViews;
    private long totalComments;
}
