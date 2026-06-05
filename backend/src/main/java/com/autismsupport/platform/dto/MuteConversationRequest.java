package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MuteConversationRequest {
    @NotNull(message = "Muted durumu belirtilmelidir")
    private Boolean muted;
}
