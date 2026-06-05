package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.Milestone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface MilestoneRepository extends JpaRepository<Milestone, UUID> {
    @Query("SELECT m FROM Milestone m JOIN FETCH m.child WHERE m.child.id = :childId ORDER BY m.achievedDate DESC")
    List<Milestone> findByChildIdOrderByAchievedDateDesc(@Param("childId") UUID childId);

    List<Milestone> findByChildIdAndCategory(UUID childId, String category);
    long countByChildId(UUID childId);
}
