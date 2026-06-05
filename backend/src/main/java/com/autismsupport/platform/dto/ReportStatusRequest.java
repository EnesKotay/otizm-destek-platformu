package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReportStatusRequest {
    @NotBlank(message = "Durum zorunludur")
    private String status;
    private String adminNote;
}
