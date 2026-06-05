package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.TreatmentState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TreatmentStateRepository extends JpaRepository<TreatmentState, UUID> {
    Optional<TreatmentState> findByChildId(UUID childId);
}
