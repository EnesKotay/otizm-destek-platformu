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
    private String bio;
    private boolean verified;
    private boolean licenseVerified;
    private boolean kvkkConsent;
    private boolean isActive;
    private List<String> specializations;
    private String profileImageUrl;
    private LocalDateTime createdAt;
    private Double avgRating;
    private Long articleCount;
    private Long reviewCount;
}
