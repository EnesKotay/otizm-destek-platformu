package com.autismsupport.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserDto {
    private UUID id;
    private String email;
    private String fullName;
    private String phone;
    private String role;
    private String expertTitle;
    private String city;
    private String institution;
    private String licenseNumber;
    private String licenseDocumentUrl;
    private String bio;
    private boolean verified;
    private boolean emailVerified;
    private boolean licenseVerified;
    private boolean kvkkConsent;
    private boolean consentAiAnalysis;
    private LocalDateTime consentAiAnalysisDate;
    private boolean consentEmergencyCard;
    private LocalDateTime consentEmergencyCardDate;
    private boolean isActive;
    private boolean onboardingCompleted;
    private List<String> specializations;
    private String profileImageUrl;
    private LocalDateTime createdAt;
    private Double avgRating;
    private Long articleCount;
    private Long reviewCount;
    private boolean acceptingPatients;
    private List<String> ageGroups;
    private List<String> supportTopics;
    private List<String> spokenLanguages;
    private Integer sessionDurationMinutes;
    private String cancellationPolicy;
    private String reschedulePolicy;
    private String nextAvailableAppointment;
    private boolean allowDirectMessages;
    private boolean allowFamilyMessages;
    private boolean hideOnlineStatus;
    private boolean approximateLocationOnly;
    private List<String> communicationPreferences;
    private List<String> supportIntents;
    private java.math.BigDecimal sessionFeeMin;
    private java.math.BigDecimal sessionFeeMax;
    private boolean offersOnline;
    private boolean offersFaceToFace;
    private Double latitude;
    private Double longitude;
}
