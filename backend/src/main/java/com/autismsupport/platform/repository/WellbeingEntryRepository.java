package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.WellbeingEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WellbeingEntryRepository extends JpaRepository<WellbeingEntry, UUID> {
    List<WellbeingEntry> findByUserIdOrderByEntryDateDesc(UUID userId);
    Optional<WellbeingEntry> findByUserIdAndEntryDate(UUID userId, LocalDate date);
}
