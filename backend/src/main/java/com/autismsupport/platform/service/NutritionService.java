package com.autismsupport.platform.service;

import com.autismsupport.platform.model.DietPreference;
import com.autismsupport.platform.model.NutritionFood;
import com.autismsupport.platform.model.NutritionMeal;
import com.autismsupport.platform.exception.ResourceNotFoundException;
import com.autismsupport.platform.exception.UnauthorizedException;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.DietPreferenceRepository;
import com.autismsupport.platform.repository.NutritionFoodRepository;
import com.autismsupport.platform.repository.NutritionMealRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import com.autismsupport.platform.dto.NutritionFoodRequest;
import com.autismsupport.platform.dto.NutritionMealRequest;
import com.autismsupport.platform.dto.DietPreferenceRequest;

@Service
@RequiredArgsConstructor
public class NutritionService {

    private final NutritionFoodRepository foodRepo;
    private final NutritionMealRepository mealRepo;
    private final DietPreferenceRepository dietRepo;
    private final ChildRepository childRepository;
    private final ObjectMapper objectMapper;

    public List<NutritionFood> getFoods(UUID childId, UUID userId) {
        validateChildOwnership(childId, userId);
        return foodRepo.findByChildIdOrderByCreatedAtAsc(childId);
    }

    @Transactional
    public NutritionFood saveFood(UUID childId, UUID userId, NutritionFoodRequest request) {
        validateChildOwnership(childId, userId);
        NutritionFood food = NutritionFood.builder()
                .childId(childId)
                .userId(userId)
                .name(request.getName())
                .accepted(request.getAccepted() != null ? request.getAccepted() : true)
                .category(request.getCategory())
                .build();
        return foodRepo.save(food);
    }

    @Transactional
    public void deleteFood(UUID foodId, UUID userId) {
        NutritionFood food = foodRepo.findById(foodId)
                .orElseThrow(() -> new ResourceNotFoundException("Besin kaydi bulunamadi"));
        validateChildOwnership(food.getChildId(), userId);
        foodRepo.delete(food);
    }

    public List<NutritionMeal> getMeals(UUID childId, UUID userId) {
        validateChildOwnership(childId, userId);
        return mealRepo.findByChildIdOrderByDateDescCreatedAtDesc(childId);
    }

    @Transactional
    public NutritionMeal saveMeal(UUID childId, UUID userId, NutritionMealRequest request) throws Exception {
        validateChildOwnership(childId, userId);
        NutritionMeal meal = NutritionMeal.builder()
                .childId(childId)
                .userId(userId)
                .date(request.getDate())
                .mealType(request.getMealType())
                .foods(request.getFoods() != null ? objectMapper.writeValueAsString(request.getFoods()) : "[]")
                .mood(request.getMood())
                .notes(request.getNotes())
                .build();
        return mealRepo.save(meal);
    }

    @Transactional
    public void deleteMeal(UUID mealId, UUID userId) {
        NutritionMeal meal = mealRepo.findById(mealId)
                .orElseThrow(() -> new ResourceNotFoundException("Ogun kaydi bulunamadi"));
        validateChildOwnership(meal.getChildId(), userId);
        mealRepo.delete(meal);
    }

    public DietPreference getDiet(UUID childId, UUID userId) {
        validateChildOwnership(childId, userId);
        return dietRepo.findByChildId(childId).orElse(null);
    }

    @Transactional
    public DietPreference saveDiet(UUID childId, UUID userId, DietPreferenceRequest request) {
        validateChildOwnership(childId, userId);
        DietPreference pref = dietRepo.findByChildId(childId)
                .orElse(DietPreference.builder().childId(childId).userId(userId).build());
        if (request.getGfcfDiet() != null) pref.setGfcfDiet(request.getGfcfDiet());
        if (request.getSugarFree() != null) pref.setSugarFree(request.getSugarFree());
        if (request.getDairyFree() != null) pref.setDairyFree(request.getDairyFree());
        if (request.getGlutenFree() != null) pref.setGlutenFree(request.getGlutenFree());
        if (request.getSoyFree() != null) pref.setSoyFree(request.getSoyFree());
        if (request.getEggFree() != null) pref.setEggFree(request.getEggFree());
        if (request.getOtherDiet() != null) pref.setOtherDiet(request.getOtherDiet());
        if (request.getNotes() != null) pref.setNotes(request.getNotes());
        return dietRepo.save(pref);
    }

    private void validateChildOwnership(UUID childId, UUID userId) {
        if (!childRepository.existsByIdAndParentId(childId, userId)) {
            throw new UnauthorizedException("Bu cocuk profiline erisim yetkiniz yok");
        }
    }
}
