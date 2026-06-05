package com.autismsupport.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class NutritionMealRequest {
    @NotBlank(message = "Tarih zorunludur")
    private String date;
    
    @NotBlank(message = "Ogun tipi zorunludur")
    private String mealType;
    
    private Object foods;
    private String mood;
    private String notes;
}
