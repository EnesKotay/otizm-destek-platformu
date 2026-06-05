package com.autismsupport.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ExpertStatsDto {
    private int completedThisMonth;
    private int cancelledThisMonth;
    private int totalThisMonth;
    private double avgRating;
    private long pendingTasksCount;
    private int totalPatients;
    private int totalReviews;
    private double completionRate;
    private int totalCompletedAllTime;
    private List<MonthlyData> monthlyData;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MonthlyData {
        private String label;
        private int completed;
        private int cancelled;
    }
}
