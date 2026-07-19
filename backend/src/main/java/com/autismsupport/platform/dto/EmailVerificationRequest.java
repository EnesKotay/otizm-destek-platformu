package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class EmailVerificationRequest {
    @NotBlank
    private String token;
}
