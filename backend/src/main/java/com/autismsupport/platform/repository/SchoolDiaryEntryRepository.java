package com.autismsupport.platform.repository;
import com.autismsupport.platform.model.SchoolDiaryEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface SchoolDiaryEntryRepository extends JpaRepository<SchoolDiaryEntry, UUID> {
    List<SchoolDiaryEntry> findByChildIdOrderByDateDescCreatedAtDesc(UUID childId);
}
