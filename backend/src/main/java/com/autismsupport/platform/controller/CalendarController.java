package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.CalendarEventDto;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.CalendarService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/calendar")
@RequiredArgsConstructor
public class CalendarController {

    private final CalendarService calendarService;

    @GetMapping("/child/{childId}")
    public ResponseEntity<ApiResponse<List<CalendarEventDto>>> getEvents(
            @PathVariable UUID childId, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(calendarService.getEventsByChild(childId, principal.getId())));
    }

    @GetMapping("/child/{childId}/range")
    public ResponseEntity<ApiResponse<List<CalendarEventDto>>> getEventsByRange(
            @PathVariable UUID childId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                calendarService.getEventsByDateRange(childId, start, end, principal.getId())));
    }

    @GetMapping("/upcoming")
    public ResponseEntity<ApiResponse<List<CalendarEventDto>>> getUpcoming(@CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(calendarService.getUpcomingEvents(principal.getId())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CalendarEventDto>> createEvent(
            @Valid @RequestBody CalendarEventDto dto, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Etkinlik olusturuldu", calendarService.createEvent(dto, principal.getId())));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CalendarEventDto>> updateEvent(
            @PathVariable UUID id, @Valid @RequestBody CalendarEventDto dto, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Etkinlik guncellendi", calendarService.updateEvent(id, dto, principal.getId())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(@PathVariable UUID id, @CurrentUser UserPrincipal principal) {
        calendarService.deleteEvent(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Etkinlik silindi", null));
    }
}
