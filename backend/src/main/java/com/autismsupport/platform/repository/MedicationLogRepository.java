package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.MedicationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MedicationLogRepository extends JpaRepository<MedicationLog, UUID> {
    List<MedicationLog> findByChildIdAndLogDate(UUID childId, LocalDate date);
    Optional<MedicationLog> findByMedicationIdAndLogDateAndScheduledTime(UUID medicationId, LocalDate date, String scheduledTime);
    List<MedicationLog> findByChildIdOrderByLogDateAsc(UUID childId);
}
