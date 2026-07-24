package com.autismsupport.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ExpertProfileUpdateRequest {
    private String bio;
    private String expertTitle;
    private String institution;
    private String city;
    private List<String> specializations;
    private Boolean acceptingPatients;
    private List<String> ageGroups;
    private List<String> supportTopics;
    private List<String> spokenLanguages;
    private Integer sessionDurationMinutes;
    private String cancellationPolicy;
    private String reschedulePolicy;
    private java.math.BigDecimal sessionFeeMin;
    private java.math.BigDecimal sessionFeeMax;
    private Boolean offersOnline;
    private Boolean offersFaceToFace;
}
