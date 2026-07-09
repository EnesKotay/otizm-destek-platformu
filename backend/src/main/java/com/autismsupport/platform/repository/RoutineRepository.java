package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.Routine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RoutineRepository extends JpaRepository<Routine, UUID> {
    List<Routine> findByChildId(UUID childId);
    List<Routine> findByChildIdAndIsActiveTrue(UUID childId);

    @Query("SELECT DISTINCT r FROM Routine r LEFT JOIN FETCH r.items WHERE r.child.id = :childId AND r.isActive = true")
    List<Routine> findByChildIdAndIsActiveTrueWithItems(@Param("childId") UUID childId);

    @Query("SELECT DISTINCT r FROM Routine r JOIN FETCH r.items WHERE r.isActive = true")
    List<Routine> findByIsActiveTrueWithItems();
}

