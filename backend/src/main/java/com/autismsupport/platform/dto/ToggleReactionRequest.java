package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ToggleReactionRequest {
    @NotBlank(message = "Emoji bos olamaz")
    private String emoji;
}
