package com.autismsupport.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BuddyDto {
    private UUID relationshipId;
    private UUID buddyId;
    private String fullName;
    private String city;
    private String email;
    private String profileImageUrl;
    private Double latitude;
    private Double longitude;
    private Double distanceKm;
    private Boolean isMentorRelation;
    private String status;
}
