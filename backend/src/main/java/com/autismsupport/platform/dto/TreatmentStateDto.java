package com.autismsupport.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TreatmentStateDto {
    private Map<String, String> gameFeedback;
    private List<Map<String, Object>> customGoals;
    private Map<String, Object> sensoryProfile;
    private List<Map<String, Object>> gameSessions;
    private List<Map<String, Object>> goalProgressHistory;
}
