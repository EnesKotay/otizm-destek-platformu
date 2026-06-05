package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.ScreeningResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ScreeningResultRepository extends JpaRepository<ScreeningResult, UUID> {
    List<ScreeningResult> findByChildIdOrderByCreatedAtDesc(UUID childId);
    List<ScreeningResult> findByChildParentIdOrderByCreatedAtDesc(UUID parentId);
}
