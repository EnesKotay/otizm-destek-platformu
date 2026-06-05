package com.autismsupport.platform.dto;

import lombok.*;
import java.util.List;
import java.util.Map;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AnalyticsTrendDto {
    private List<Map<String, Object>> milestoneTrends;
    private List<Map<String, Object>> moodTrends;
    private List<Map<String, Object>> sleepTrends;
    private List<Map<String, Object>> behaviorTrends;
}
