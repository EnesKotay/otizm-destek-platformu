package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GoalRequest {
    @NotBlank(message = "Baslik zorunludur")
    private String title;
    
    private String description;
    
    @NotBlank(message = "Kategori zorunludur")
    private String category;
    
    private Integer targetCount;
    private String tokenColor;
    private String tokenEmoji;
    private String rewardTitle;
    private String rewardDescription;
    private Boolean active;
    private Object entries;
}
