package com.autismsupport.platform.dto;

import lombok.Data;

@Data
public class DietPreferenceRequest {
    private Boolean gfcfDiet;
    private Boolean sugarFree;
    private Boolean dairyFree;
    private Boolean glutenFree;
    private Boolean soyFree;
    private Boolean eggFree;
    private String otherDiet;
    private String notes;
}
