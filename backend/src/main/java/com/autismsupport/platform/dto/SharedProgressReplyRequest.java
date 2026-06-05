package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SharedProgressReplyRequest {
    @NotBlank(message = "Gonderen rolu zorunludur")
    private String fromRole;
    
    @NotBlank(message = "Gonderen adi zorunludur")
    private String fromName;
    
    @NotBlank(message = "Icerik zorunludur")
    private String content;
}
