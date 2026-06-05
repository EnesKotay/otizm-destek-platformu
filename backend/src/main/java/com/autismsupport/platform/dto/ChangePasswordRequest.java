package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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
    @Size(min = 8, message = "Yeni sifre en az 8 karakter olmalidir")
    private String newPassword;
}
