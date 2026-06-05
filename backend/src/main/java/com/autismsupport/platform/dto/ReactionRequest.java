package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReactionRequest {
    @NotBlank(message = "Emoji zorunludur")
    private String emoji;
}
