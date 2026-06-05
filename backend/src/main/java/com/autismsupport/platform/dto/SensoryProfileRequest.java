package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SensoryProfileRequest {
    @NotNull(message = "Domains alani zorunludur")
    private Object domains;
}
