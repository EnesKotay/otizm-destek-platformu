package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.CalendarEventDto;
import com.autismsupport.platform.exception.ResourceNotFoundException;
import com.autismsupport.platform.exception.UnauthorizedException;
import com.autismsupport.platform.model.CalendarEvent;
import com.autismsupport.platform.model.Child;
import com.autismsupport.platform.repository.CalendarEventRepository;
import com.autismsupport.platform.repository.ChildRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CalendarService {

    private final CalendarEventRepository eventRepository;
    private final ChildRepository childRepository;

    public List<CalendarEventDto> getEventsByChild(UUID childId, UUID parentId) {
        validateChildOwnership(childId, parentId);
        return eventRepository.findByChildIdOrderByStartTimeAsc(childId).stream()
                .map(this::toDto)
                .toList();
    }

    public List<CalendarEventDto> getEventsByDateRange(UUID childId, LocalDateTime start, LocalDateTime end, UUID parentId) {
        validateChildOwnership(childId, parentId);
        return eventRepository.findByChildIdAndDateRange(childId, start, end).stream()
                .map(this::toDto)
                .toList();
    }

    public List<CalendarEventDto> getUpcomingEvents(UUID parentId) {
        return eventRepository.findUpcomingByParentId(parentId, LocalDateTime.now()).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public CalendarEventDto createEvent(CalendarEventDto dto, UUID parentId) {
        Child child = childRepository.findById(dto.getChildId())
                .orElseThrow(() -> new RuntimeException("Çocuk profili bulunamadı"));
        validateChildOwnership(child, parentId);

        CalendarEvent event = CalendarEvent.builder()
                .child(child)
                .title(dto.getTitle())
                .description(dto.getDescription())
                .eventType(dto.getEventType())
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .recurrenceRule(dto.getRecurrenceRule())
                .reminderEnabled(dto.isReminderEnabled())
                .color(dto.getColor() != null ? dto.getColor() : "#4F46E5")
                .build();

        event = eventRepository.save(event);
        return toDto(event);
    }

    @Transactional
    public CalendarEventDto updateEvent(UUID eventId, CalendarEventDto dto, UUID parentId) {
        CalendarEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Etkinlik bulunamadı"));
        validateChildOwnership(event.getChild(), parentId);

        event.setTitle(dto.getTitle());
        event.setDescription(dto.getDescription());
        event.setEventType(dto.getEventType());
        event.setStartTime(dto.getStartTime());
        event.setEndTime(dto.getEndTime());
        event.setRecurrenceRule(dto.getRecurrenceRule());
        event.setReminderEnabled(dto.isReminderEnabled());
        if (dto.getColor() != null) {
            event.setColor(dto.getColor());
        }

        event = eventRepository.save(event);
        return toDto(event);
    }

    @Transactional
    public void deleteEvent(UUID eventId, UUID parentId) {
        CalendarEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Etkinlik bulunamadı"));
        validateChildOwnership(event.getChild(), parentId);
        eventRepository.delete(event);
    }

    private void validateChildOwnership(UUID childId, UUID parentId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new ResourceNotFoundException("Çocuk profili bulunamadı"));
        validateChildOwnership(child, parentId);
    }

    private void validateChildOwnership(Child child, UUID parentId) {
        if (!child.getParent().getId().equals(parentId)) {
            throw new UnauthorizedException("Bu çocuk profiline erişim yetkiniz yok");
        }
    }

    private CalendarEventDto toDto(CalendarEvent event) {
        return CalendarEventDto.builder()
                .id(event.getId())
                .title(event.getTitle())
                .description(event.getDescription())
                .eventType(event.getEventType())
                .startTime(event.getStartTime())
                .endTime(event.getEndTime())
                .recurrenceRule(event.getRecurrenceRule())
                .reminderEnabled(event.isReminderEnabled())
                .color(event.getColor())
                .childId(event.getChild().getId())
                .createdAt(event.getCreatedAt())
                .build();
    }
}
