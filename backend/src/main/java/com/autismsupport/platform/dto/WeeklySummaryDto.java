package com.autismsupport.platform.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class WeeklySummaryDto {
    private String userName;
    private int completedActivitiesCount;
    private int completedGoalsCount;
    private int completedAppointmentsCount;
    private int unreadMessagesCount;
    private List<String> upcomingAppointments;
    private List<String> recommendedResources;
    private String currentWeek;
}
