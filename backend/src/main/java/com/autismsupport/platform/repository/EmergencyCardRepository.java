package com.autismsupport.platform.repository;
import com.autismsupport.platform.model.EmergencyCard;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;
public interface EmergencyCardRepository extends JpaRepository<EmergencyCard, UUID> {
    Optional<EmergencyCard> findByChildIdAndUserId(UUID childId, UUID userId);
    Optional<EmergencyCard> findByChildId(UUID childId);
}
