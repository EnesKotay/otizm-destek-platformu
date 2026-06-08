package com.autismsupport.platform.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UpdateProfileRequest {

    @Size(min = 2, message = "Ad soyad en az 2 karakter olmalidir")
    private String fullName;

    private String phone;

    private String city;

    private String profileImageUrl;

    // Expert profile fields
    @Size(max = 500, message = "Biyografi en fazla 500 karakter olabilir")
    private String bio;

    private String institution;

    private String licenseNumber;

    private String expertTitle;

    private Double latitude;

    private Double longitude;
}
