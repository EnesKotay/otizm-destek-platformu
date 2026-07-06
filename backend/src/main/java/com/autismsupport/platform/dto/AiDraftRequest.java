package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AiDraftRequest {
    @NotBlank(message = "Konu veya açıklama alanı boş bırakılamaz")
    private String prompt;
}
