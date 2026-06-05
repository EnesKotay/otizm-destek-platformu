package com.autismsupport.platform.repository;
import com.autismsupport.platform.model.SensoryProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;
public interface SensoryProfileRepository extends JpaRepository<SensoryProfile, UUID> {
    Optional<SensoryProfile> findByChildIdAndUserId(UUID childId, UUID userId);
    Optional<SensoryProfile> findByChildId(UUID childId);
}
