package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.SleepEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SleepEntryRepository extends JpaRepository<SleepEntry, UUID> {
    List<SleepEntry> findByChildIdOrderBySleepDateDesc(UUID childId);
    List<SleepEntry> findByChildIdAndSleepDateBetweenOrderBySleepDateAsc(UUID childId, LocalDate from, LocalDate to);
    Optional<SleepEntry> findByChildIdAndSleepDate(UUID childId, LocalDate date);
}
