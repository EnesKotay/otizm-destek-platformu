package com.autismsupport.platform.repository;
import com.autismsupport.platform.model.SharedProgressNote;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface SharedProgressNoteRepository extends JpaRepository<SharedProgressNote, UUID> {
    List<SharedProgressNote> findByChildIdOrderByCreatedAtDesc(UUID childId);
    List<SharedProgressNote> findByChildIdAndCreatedAtAfterOrderByCreatedAtAsc(UUID childId, java.time.LocalDateTime after);
    long countByChildIdAndStatus(UUID childId, String status);
    long countByChildIdAndType(UUID childId, String type);
}
