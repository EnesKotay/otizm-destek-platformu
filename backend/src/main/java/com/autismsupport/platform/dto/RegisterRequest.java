package com.autismsupport.platform.dto;

import com.autismsupport.platform.validation.StrongPassword;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.List;

@Data
public class RegisterRequest {
    @NotBlank(message = "E-posta adresi zorunludur")
    @Email(message = "Gecerli bir e-posta adresi giriniz")
    private String email;

    @NotBlank(message = "Sifre zorunludur")
    @StrongPassword
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
    private String licenseDocumentUrl;
    private String bio;
    private List<String> specializations;
    private String captchaToken;
}
