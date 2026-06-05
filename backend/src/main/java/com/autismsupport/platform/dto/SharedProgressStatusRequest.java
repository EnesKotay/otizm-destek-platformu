package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SharedProgressStatusRequest {
    @NotBlank(message = "Durum zorunludur")
    private String status;
}
