package com.autismsupport.platform.dto;

import com.autismsupport.platform.validation.StrongPassword;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ChangePasswordRequest {
    
    @NotBlank(message = "Mevcut sifre bos olamaz")
    private String currentPassword;
    
    @NotBlank(message = "Yeni sifre bos olamaz")
    @StrongPassword
    private String newPassword;
}
