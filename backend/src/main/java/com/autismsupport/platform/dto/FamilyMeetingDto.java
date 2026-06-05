package com.autismsupport.platform.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;
import jakarta.validation.constraints.NotNull;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class FamilyMeetingDto {
    private UUID id;
    private UUID hostParentId;
    private String hostParentName;
    @NotNull private UUID guestParentId;
    private String guestParentName;
    @NotNull private LocalDateTime scheduledTime;
    private String meetingLink;
    private String status;
    private String notes;
}
