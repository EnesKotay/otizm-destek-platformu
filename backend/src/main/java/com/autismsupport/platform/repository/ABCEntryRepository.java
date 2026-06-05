package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.ABCEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ABCEntryRepository extends JpaRepository<ABCEntry, UUID> {
    List<ABCEntry> findByChildIdOrderByEntryDateDescEntryTimeDescCreatedAtDesc(UUID childId);
}
