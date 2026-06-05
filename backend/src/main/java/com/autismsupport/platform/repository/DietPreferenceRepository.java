package com.autismsupport.platform.repository;
import com.autismsupport.platform.model.DietPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;
public interface DietPreferenceRepository extends JpaRepository<DietPreference, UUID> {
    Optional<DietPreference> findByChildId(UUID childId);
}
