package com.autismsupport.platform.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateAppointmentRequest {
    private String notes;
    private String type;

    @Size(max = 500, message = "Toplantı linki en fazla 500 karakter olabilir")
    @Pattern(
        regexp = "^$|^https?://.*",
        message = "Toplantı linki geçerli bir URL olmalıdır (http:// veya https:// ile başlamalı)"
    )
    private String meetingLink;
}
