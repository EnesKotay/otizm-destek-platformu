package com.autismsupport.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClinicalShareDto {
    private UUID id;
    private UUID childId;
    private String childName;
    private UUID expertId;
    private String expertName;
    private String expertTitle;
    private Boolean shareBehaviorJournal;
    private Boolean shareSensoryProfile;
    private Boolean shareScreeningResults;
    private Boolean shareDailyTracker;
    private String status;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
}
