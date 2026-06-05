package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.MoodEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MoodEntryRepository extends JpaRepository<MoodEntry, UUID> {
    List<MoodEntry> findByChildIdOrderByEntryDateDesc(UUID childId);
    List<MoodEntry> findByChildIdAndEntryDateBetweenOrderByEntryDateAsc(UUID childId, LocalDate from, LocalDate to);
    Optional<MoodEntry> findByChildIdAndEntryDate(UUID childId, LocalDate date);
}
