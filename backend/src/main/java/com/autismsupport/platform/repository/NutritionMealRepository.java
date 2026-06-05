package com.autismsupport.platform.repository;
import com.autismsupport.platform.model.NutritionMeal;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface NutritionMealRepository extends JpaRepository<NutritionMeal, UUID> {
    List<NutritionMeal> findByChildIdOrderByDateDescCreatedAtDesc(UUID childId);
}
