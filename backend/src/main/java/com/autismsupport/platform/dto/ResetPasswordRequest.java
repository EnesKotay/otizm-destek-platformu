package com.autismsupport.platform.dto;

import com.autismsupport.platform.validation.StrongPassword;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ResetPasswordRequest {
    @NotBlank(message = "Sifirlama tokeni zorunludur")
    private String token;

    @NotBlank(message = "Yeni sifre zorunludur")
    @StrongPassword
    private String password;
}
