package com.autismsupport.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminStatsDto {
    private long totalUsers;
    private long totalExperts;
    private long pendingExperts;
    private long totalPosts;
    private long totalMessages;
    private long newUsersThisWeek;
    private long pendingReports;
}
