package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.model.DietPreference;
import com.autismsupport.platform.model.NutritionFood;
import com.autismsupport.platform.model.NutritionMeal;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.NutritionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import com.autismsupport.platform.dto.NutritionFoodRequest;
import com.autismsupport.platform.dto.NutritionMealRequest;
import com.autismsupport.platform.dto.DietPreferenceRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/nutrition")
@RequiredArgsConstructor
public class NutritionController {

    private final NutritionService service;

    // Foods
    @GetMapping("/foods/{childId}")
    public ResponseEntity<ApiResponse<List<NutritionFood>>> getFoods(@PathVariable UUID childId, @CurrentUser UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.success(service.getFoods(childId, p.getId())));
    }

    @PostMapping("/foods/{childId}")
    public ResponseEntity<ApiResponse<NutritionFood>> addFood(@PathVariable UUID childId,
            @Valid @RequestBody NutritionFoodRequest request, @CurrentUser UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.success(service.saveFood(childId, p.getId(), request)));
    }

    @DeleteMapping("/foods/{foodId}")
    public ResponseEntity<ApiResponse<Void>> deleteFood(@PathVariable UUID foodId, @CurrentUser UserPrincipal p) {
        service.deleteFood(foodId, p.getId());
        return ResponseEntity.ok(ApiResponse.success("Silindi", null));
    }

    // Meals
    @GetMapping("/meals/{childId}")
    public ResponseEntity<ApiResponse<List<NutritionMeal>>> getMeals(@PathVariable UUID childId, @CurrentUser UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.success(service.getMeals(childId, p.getId())));
    }

    @PostMapping("/meals/{childId}")
    public ResponseEntity<ApiResponse<NutritionMeal>> addMeal(@PathVariable UUID childId,
            @Valid @RequestBody NutritionMealRequest request, @CurrentUser UserPrincipal p) throws Exception {
        return ResponseEntity.ok(ApiResponse.success(service.saveMeal(childId, p.getId(), request)));
    }

    @DeleteMapping("/meals/{mealId}")
    public ResponseEntity<ApiResponse<Void>> deleteMeal(@PathVariable UUID mealId, @CurrentUser UserPrincipal p) {
        service.deleteMeal(mealId, p.getId());
        return ResponseEntity.ok(ApiResponse.success("Silindi", null));
    }

    // Diet Preferences
    @GetMapping("/diet/{childId}")
    public ResponseEntity<ApiResponse<DietPreference>> getDiet(@PathVariable UUID childId, @CurrentUser UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.success(service.getDiet(childId, p.getId())));
    }

    @PutMapping("/diet/{childId}")
    public ResponseEntity<ApiResponse<DietPreference>> saveDiet(@PathVariable UUID childId,
            @Valid @RequestBody DietPreferenceRequest request, @CurrentUser UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.success(service.saveDiet(childId, p.getId(), request)));
    }
}
