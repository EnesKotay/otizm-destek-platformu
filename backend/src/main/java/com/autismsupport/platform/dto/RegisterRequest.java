package com.autismsupport.platform.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.List;

@Data
public class RegisterRequest {
    @NotBlank(message = "E-posta adresi zorunludur")
    @Email(message = "Gecerli bir e-posta adresi giriniz")
    private String email;

    @NotBlank(message = "Sifre zorunludur")
    @Size(min = 8, message = "Sifre en az 8 karakter olmalidir")
    private String password;

    @NotBlank(message = "Ad soyad zorunludur")
    private String fullName;

    private String phone;
    private String city;

    private boolean kvkkConsent;

    // Expert registration fields (ignored for PARENT role)
    private String role;
    private String expertTitle;
    private String institution;
    private String licenseNumber;
    private String bio;
    private List<String> specializations;
}
