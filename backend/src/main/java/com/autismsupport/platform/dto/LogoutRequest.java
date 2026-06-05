package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LogoutRequest {
    @NotBlank(message = "Refresh token zorunludur")
    private String refreshToken;
}
