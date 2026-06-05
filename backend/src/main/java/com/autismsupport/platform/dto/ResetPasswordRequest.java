package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ResetPasswordRequest {
    @NotBlank(message = "Sifirlama tokeni zorunludur")
    private String token;

    @NotBlank(message = "Yeni sifre zorunludur")
    @Size(min = 8, message = "Sifre en az 8 karakter olmalidir")
    private String password;
}
