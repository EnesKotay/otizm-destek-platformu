package com.autismsupport.platform.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ForgotPasswordRequest {
    @NotBlank(message = "E-posta adresi zorunludur")
    @Email(message = "Gecerli bir e-posta adresi giriniz")
    private String email;
}
