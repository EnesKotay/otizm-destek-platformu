package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.CalendarEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface CalendarEventRepository extends JpaRepository<CalendarEvent, UUID> {

    @Query("SELECT e FROM CalendarEvent e LEFT JOIN FETCH e.child WHERE e.child.id = :childId ORDER BY e.startTime ASC")
    List<CalendarEvent> findByChildIdOrderByStartTimeAsc(@Param("childId") UUID childId);

    @Query("SELECT e FROM CalendarEvent e LEFT JOIN FETCH e.child WHERE e.child.id = :childId AND e.startTime BETWEEN :start AND :end ORDER BY e.startTime")
    List<CalendarEvent> findByChildIdAndDateRange(
            @Param("childId") UUID childId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    // Ebeveynin tüm çocuklarına ait yaklaşan etkinlikler
    @Query("SELECT e FROM CalendarEvent e LEFT JOIN FETCH e.child c WHERE c.parent.id = :parentId AND e.startTime >= :from AND e.status = 'PLANNED' ORDER BY e.startTime")
    List<CalendarEvent> findUpcomingByParentId(@Param("parentId") UUID parentId, @Param("from") LocalDateTime from);

    @Query("SELECT e FROM CalendarEvent e LEFT JOIN FETCH e.child WHERE e.status = 'PLANNED' AND e.reminderSent = false AND e.reminderMinutesBefore IS NOT NULL AND e.startTime BETWEEN :windowStart AND :windowEnd ORDER BY e.startTime")
    List<CalendarEvent> findEventsNeedingReminder(@Param("windowStart") LocalDateTime windowStart, @Param("windowEnd") LocalDateTime windowEnd);
}
