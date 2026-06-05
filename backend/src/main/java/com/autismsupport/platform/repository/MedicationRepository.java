package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.Medication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface MedicationRepository extends JpaRepository<Medication, UUID> {
    List<Medication> findByChildIdAndIsActiveTrueOrderByNameAsc(UUID childId);
    List<Medication> findByChildIdOrderByCreatedAtDesc(UUID childId);
}
