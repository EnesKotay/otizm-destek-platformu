package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.Child;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface ChildRepository extends JpaRepository<Child, UUID> {
    List<Child> findByParentId(UUID parentId);
    long countByParentId(UUID parentId);
    boolean existsByIdAndParentId(UUID childId, UUID parentId);

    @Query("SELECT DISTINCT c FROM Child c LEFT JOIN FETCH c.tags LEFT JOIN FETCH c.parent WHERE c.parent.matchingEnabled = true")
    List<Child> findAllWithTagsAndParentForMatching();
}
