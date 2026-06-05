package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.RoutineItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RoutineItemRepository extends JpaRepository<RoutineItem, UUID> {
    List<RoutineItem> findByRoutineIdOrderByScheduledTimeAsc(UUID routineId);
}
