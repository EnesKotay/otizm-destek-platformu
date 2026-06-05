package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ToggleArchiveRequest {
    @NotNull(message = "Archive durumu zorunludur")
    private Boolean archived;
}
