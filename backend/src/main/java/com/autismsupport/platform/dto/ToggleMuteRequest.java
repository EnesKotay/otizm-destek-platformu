package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ToggleMuteRequest {
    @NotNull(message = "Mute durumu zorunludur")
    private Boolean muted;
}
