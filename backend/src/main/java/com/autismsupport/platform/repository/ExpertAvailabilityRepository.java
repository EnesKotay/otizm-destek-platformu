package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.ExpertAvailability;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExpertAvailabilityRepository extends JpaRepository<ExpertAvailability, UUID> {
    List<ExpertAvailability> findByExpertIdOrderByDayOfWeekAsc(UUID expertId);
    Optional<ExpertAvailability> findByExpertIdAndDayOfWeek(UUID expertId, Integer dayOfWeek);
}
