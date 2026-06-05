package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.DevelopmentNote;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DevelopmentNoteRepository extends JpaRepository<DevelopmentNote, UUID> {
    Page<DevelopmentNote> findByChildIdOrderByNoteDateDesc(UUID childId, Pageable pageable);
    List<DevelopmentNote> findByChildIdAndCategory(UUID childId, String category);
    List<DevelopmentNote> findTop5ByChildIdOrderByCreatedAtDesc(UUID childId);
    List<DevelopmentNote> findByChildId(UUID childId);
    long countByChildId(UUID childId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(n) FROM DevelopmentNote n JOIN n.child c WHERE c.parent.id = :parentId")
    long countTotalByParentId(@org.springframework.data.repository.query.Param("parentId") UUID parentId);
}
