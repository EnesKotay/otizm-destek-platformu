package com.autismsupport.platform.repository;
import com.autismsupport.platform.model.NutritionFood;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface NutritionFoodRepository extends JpaRepository<NutritionFood, UUID> {
    List<NutritionFood> findByChildIdOrderByCreatedAtAsc(UUID childId);
}
