package com.autismsupport.platform.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class AddPatientRequest {

    @NotBlank(message = "Ebeveyn e-postasi zorunludur")
    @Email(message = "Gecerli bir e-posta adresi giriniz")
    private String parentEmail;

    @NotNull(message = "Cocuk ID zorunludur")
    private UUID childId;
}