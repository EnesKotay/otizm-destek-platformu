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
import java.time.YearMonth;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CalendarService {

    private static final Set<String> VALID_STATUSES = Set.of("PLANNED", "COMPLETED", "CANCELLED");
    private static final Set<String> VALID_EVENT_TYPES = Set.of("TERAPI", "DOKTOR", "EGITIM", "AKTIVITE", "APPOINTMENT", "DIGER");

    private final CalendarEventRepository eventRepository;
    private final ChildRepository childRepository;

    public List<CalendarEventDto> getEventsByChild(UUID childId, UUID parentId) {
        validateChildOwnership(childId, parentId);
        return eventRepository.findByChildIdOrderByStartTimeAsc(childId)
                .stream().map(this::toDto).toList();
    }

    public List<CalendarEventDto> getEventsByDateRange(UUID childId, LocalDateTime start, LocalDateTime end, UUID parentId) {
        validateChildOwnership(childId, parentId);
        if (start.isAfter(end)) throw new RuntimeException("Baslangic tarihi bitis tarihinden sonra olamaz");
        return eventRepository.findByChildIdAndDateRange(childId, start, end)
                .stream().map(this::toDto).toList();
    }

    // Ay bazlı verimli sorgu — sadece o ayın verilerini çeker
    public List<CalendarEventDto> getEventsByMonth(UUID childId, int year, int month, UUID parentId) {
        validateChildOwnership(childId, parentId);
        YearMonth ym = YearMonth.of(year, month);
        LocalDateTime start = ym.atDay(1).atStartOfDay();
        LocalDateTime end = ym.atEndOfMonth().atTime(23, 59, 59);
        return eventRepository.findByChildIdAndDateRange(childId, start, end)
                .stream().map(this::toDto).toList();
    }

    public List<CalendarEventDto> getUpcomingEvents(UUID parentId) {
        return eventRepository.findUpcomingByParentId(parentId, LocalDateTime.now())
                .stream().map(this::toDto).toList();
    }

    public List<CalendarEventDto> getUpcomingLimited(UUID parentId, int limit) {
        return eventRepository.findUpcomingByParentId(parentId, LocalDateTime.now())
                .stream().limit(limit > 0 ? limit : 5).map(this::toDto).toList();
    }

    @Transactional
    public CalendarEventDto createEvent(CalendarEventDto dto, UUID parentId) {
        Child child = childRepository.findById(dto.getChildId())
                .orElseThrow(() -> new ResourceNotFoundException("Cocuk profili bulunamadi"));
        validateChildOwnership(child, parentId);
        validateEventDto(dto);

        CalendarEvent event = CalendarEvent.builder()
                .child(child)
                .title(dto.getTitle().trim())
                .description(dto.getDescription() != null ? dto.getDescription().trim() : null)
                .eventType(dto.getEventType().toUpperCase())
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .recurrenceRule(dto.getRecurrenceRule())
                .status("PLANNED")
                .location(dto.getLocation() != null ? dto.getLocation().trim() : null)
                .reminderMinutesBefore(dto.getReminderMinutesBefore())
                .color(dto.getColor() != null && !dto.getColor().isBlank() ? dto.getColor() : "#4F46E5")
                .build();

        return toDto(eventRepository.save(event));
    }

    @Transactional
    public CalendarEventDto updateEvent(UUID eventId, CalendarEventDto dto, UUID parentId) {
        CalendarEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Etkinlik bulunamadi"));
        validateChildOwnership(event.getChild(), parentId);
        validateEventDto(dto);

        event.setTitle(dto.getTitle().trim());
        event.setDescription(dto.getDescription() != null ? dto.getDescription().trim() : null);
        event.setEventType(dto.getEventType().toUpperCase());
        event.setStartTime(dto.getStartTime());
        event.setEndTime(dto.getEndTime());
        event.setRecurrenceRule(dto.getRecurrenceRule());
        event.setLocation(dto.getLocation() != null ? dto.getLocation().trim() : null);
        event.setReminderMinutesBefore(dto.getReminderMinutesBefore());
        if (dto.getColor() != null && !dto.getColor().isBlank()) event.setColor(dto.getColor());
        // Eğer zaman değiştiyse hatırlatmayı sıfırla
        event.setReminderSent(false);

        return toDto(eventRepository.save(event));
    }

    @Transactional
    public CalendarEventDto updateStatus(UUID eventId, String status, UUID parentId) {
        CalendarEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Etkinlik bulunamadi"));
        validateChildOwnership(event.getChild(), parentId);
        String normalized = status.trim().toUpperCase();
        if (!VALID_STATUSES.contains(normalized)) {
            throw new RuntimeException("Gecersiz etkinlik durumu: " + status);
        }
        event.setStatus(normalized);
        return toDto(eventRepository.save(event));
    }

    @Transactional
    public void deleteEvent(UUID eventId, UUID parentId) {
        CalendarEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Etkinlik bulunamadi"));
        validateChildOwnership(event.getChild(), parentId);
        eventRepository.delete(event);
    }

    private void validateEventDto(CalendarEventDto dto) {
        if (dto.getEndTime() != null && dto.getStartTime() != null && dto.getEndTime().isBefore(dto.getStartTime())) {
            throw new RuntimeException("Bitis zamani baslangic zamanindan once olamaz");
        }
        String type = dto.getEventType().toUpperCase();
        if (!VALID_EVENT_TYPES.contains(type)) {
            throw new RuntimeException("Gecersiz etkinlik tipi: " + dto.getEventType());
        }
    }

    private void validateChildOwnership(UUID childId, UUID parentId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new ResourceNotFoundException("Cocuk profili bulunamadi"));
        validateChildOwnership(child, parentId);
    }

    private void validateChildOwnership(Child child, UUID parentId) {
        if (!child.getParent().getId().equals(parentId)) {
            throw new UnauthorizedException("Bu cocuk profiline erisim yetkiniz yok");
        }
    }

    CalendarEventDto toDto(CalendarEvent event) {
        return CalendarEventDto.builder()
                .id(event.getId())
                .title(event.getTitle())
                .description(event.getDescription())
                .eventType(event.getEventType())
                .startTime(event.getStartTime())
                .endTime(event.getEndTime())
                .recurrenceRule(event.getRecurrenceRule())
                .status(event.getStatus())
                .location(event.getLocation())
                .reminderMinutesBefore(event.getReminderMinutesBefore())
                .color(event.getColor())
                .childId(event.getChild().getId())
                .childName(event.getChild().getName())
                .createdAt(event.getCreatedAt())
                .build();
    }
}
