package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DeleteAccountRequest {
    @NotBlank(message = "Mevcut şifre zorunludur")
    private String currentPassword;
}
