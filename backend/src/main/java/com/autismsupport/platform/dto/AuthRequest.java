package com.autismsupport.platform.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AuthRequest {
    @NotBlank(message = "E-posta adresi zorunludur")
    @Email(message = "Gecerli bir e-posta adresi giriniz")
    private String email;

    @NotBlank(message = "Sifre zorunludur")
    @Size(min = 8, message = "Sifre en az 8 karakter olmalidir")
    private String password;
}
