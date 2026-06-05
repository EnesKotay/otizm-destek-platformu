package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class NutritionFoodRequest {
    @NotBlank(message = "Yemek adi zorunludur")
    private String name;
    
    private Boolean accepted;
    private String category;
}
