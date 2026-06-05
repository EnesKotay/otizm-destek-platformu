package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SchoolDiaryEntryRequest {
    @NotBlank(message = "Tarih zorunludur")
    private String date;
    
    @NotBlank(message = "Gonderen rolu zorunludur")
    private String from;
    
    @NotBlank(message = "Gonderen adi zorunludur")
    private String fromName;
    
    @NotBlank(message = "Kategori zorunludur")
    private String category;
    
    @NotBlank(message = "Icerik zorunludur")
    private String content;
}
