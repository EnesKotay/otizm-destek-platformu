package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SharedProgressNoteRequest {
    @NotBlank(message = "Gonderen rolu zorunludur")
    private String fromRole;
    
    @NotBlank(message = "Gonderen adi zorunludur")
    private String fromName;
    
    private String type;
    
    @NotBlank(message = "Baslik zorunludur")
    private String title;
    
    private String content;
    private String dueDate;
    private String expertId;
    private String status;
}
