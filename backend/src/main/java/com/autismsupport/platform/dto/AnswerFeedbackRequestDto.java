package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AnswerFeedbackRequestDto {
    @NotBlank(message = "Sonuç seçimi zorunludur")
    private String outcome;
}

