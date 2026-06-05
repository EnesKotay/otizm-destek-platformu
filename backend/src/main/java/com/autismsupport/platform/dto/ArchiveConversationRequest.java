package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ArchiveConversationRequest {
    @NotNull(message = "Archived durumu belirtilmelidir")
    private Boolean archived;
}
