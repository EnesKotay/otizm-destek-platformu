package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.CalendarEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface CalendarEventRepository extends JpaRepository<CalendarEvent, UUID> {
    List<CalendarEvent> findByChildIdOrderByStartTimeAsc(UUID childId);

    @Query("SELECT e FROM CalendarEvent e WHERE e.child.id = :childId AND e.startTime BETWEEN :start AND :end ORDER BY e.startTime")
    List<CalendarEvent> findByChildIdAndDateRange(
        @Param("childId") UUID childId,
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end
    );

    @Query("SELECT e FROM CalendarEvent e WHERE e.child.parent.id = :parentId AND e.startTime >= :from ORDER BY e.startTime")
    List<CalendarEvent> findUpcomingByParentId(@Param("parentId") UUID parentId, @Param("from") LocalDateTime from);
}
