package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.AppointmentDto;
import com.autismsupport.platform.dto.AppointmentHistoryDto;
import com.autismsupport.platform.dto.ExpertAvailabilityDto;
import com.autismsupport.platform.dto.BlockSlotRequest;
import com.autismsupport.platform.dto.RescheduleAppointmentRequest;
import com.autismsupport.platform.dto.SessionNotesRequest;
import com.autismsupport.platform.dto.UpdateAppointmentRequest;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.AppointmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AppointmentDto>>> getAppointments(@CurrentUser UserPrincipal principal) {
        String role = principal.getAuthorities().stream().findFirst()
                .map(authority -> authority.getAuthority().replace("ROLE_", ""))
                .orElse("PARENT");
        return ResponseEntity.ok(ApiResponse.success(appointmentService.getAppointments(principal.getId(), role)));
    }

    @PostMapping
    @PreAuthorize("hasRole('PARENT')")
    public ResponseEntity<ApiResponse<AppointmentDto>> createAppointment(
            @Valid @RequestBody AppointmentDto dto,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                "Randevu talebi olusturuldu",
                appointmentService.createAppointment(principal.getId(), dto)
        ));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<AppointmentDto>> cancelAppointment(
            @PathVariable UUID id,
            @RequestBody(required = false) com.autismsupport.platform.dto.CancelAppointmentRequest request,
            @CurrentUser UserPrincipal principal) {
        String reason = request != null ? request.getReason() : null;
        return ResponseEntity.ok(ApiResponse.success(
                "Randevu iptal edildi",
                appointmentService.cancelAppointment(id, principal.getId(), reason)
        ));
    }

    @PatchMapping("/{id}/reschedule")
    public ResponseEntity<ApiResponse<AppointmentDto>> rescheduleAppointment(
            @PathVariable UUID id,
            @Valid @RequestBody RescheduleAppointmentRequest request,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                "Randevu yeniden planlandi",
                appointmentService.rescheduleAppointment(id, principal.getId(), request.getDate(), request.getTime(), request.getDuration())
        ));
    }

    @PatchMapping("/{id}/update")
    public ResponseEntity<ApiResponse<AppointmentDto>> updateAppointment(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateAppointmentRequest request,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                "Randevu guncellendi",
                appointmentService.updateAppointment(id, principal.getId(), request.getNotes(), request.getType(), request.getMeetingLink())
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAppointment(
            @PathVariable UUID id,
            @CurrentUser UserPrincipal principal) {
        appointmentService.deleteAppointment(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Randevu silindi", null));
    }

    @PatchMapping("/{id}/confirm")
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<ApiResponse<AppointmentDto>> confirmAppointment(
            @PathVariable UUID id,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                "Randevu onaylandi",
                appointmentService.confirmAppointment(id, principal.getId())
        ));
    }

    @PatchMapping("/{id}/complete")
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<ApiResponse<AppointmentDto>> completeAppointment(
            @PathVariable UUID id,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                "Randevu tamamlandi olarak isaretlendi",
                appointmentService.completeAppointment(id, principal.getId())
        ));
    }

    @PatchMapping("/{id}/session-notes")
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<ApiResponse<AppointmentDto>> updateSessionNotes(
            @PathVariable UUID id,
            @Valid @RequestBody SessionNotesRequest request,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                "Seans notu kaydedildi",
                appointmentService.updateSessionNotes(id, principal.getId(), request.getSessionNotes(),
                        request.getSessionSummary(), request.getFollowUpRecommendations(), request.getFollowUpTask())
        ));
    }

    @GetMapping("/availability")
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<ApiResponse<List<ExpertAvailabilityDto>>> getAvailability(@CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(appointmentService.getAvailabilities(principal.getId())));
    }

    @GetMapping("/experts/{expertId}/availability")
    public ResponseEntity<ApiResponse<List<ExpertAvailabilityDto>>> getExpertAvailability(@PathVariable UUID expertId) {
        return ResponseEntity.ok(ApiResponse.success(appointmentService.getAvailabilities(expertId)));
    }

    @GetMapping("/experts/{expertId}/booked-times")
    public ResponseEntity<ApiResponse<List<String>>> getExpertBookedTimes(
            @PathVariable UUID expertId,
            @RequestParam java.time.LocalDate date,
            @RequestParam(required = false, defaultValue = "50") Integer duration) {
        return ResponseEntity.ok(ApiResponse.success(appointmentService.getBookedTimes(expertId, date, duration)));
    }

    @GetMapping("/experts/{expertId}/next-available")
    public ResponseEntity<ApiResponse<java.util.Map<String, String>>> getNextAvailable(
            @PathVariable UUID expertId,
            @RequestParam(required = false) Integer duration) {
        return ResponseEntity.ok(ApiResponse.success(appointmentService.getNextAvailableSlot(expertId, duration)));
    }

    @PutMapping("/availability")
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<ApiResponse<List<ExpertAvailabilityDto>>> saveAvailability(
            @Valid @RequestBody List<@Valid ExpertAvailabilityDto> items,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                "Musaitlik plani guncellendi",
                appointmentService.saveAvailabilities(principal.getId(), items)
        ));
    }

    @PostMapping("/block-slot")
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<ApiResponse<ExpertAvailabilityDto>> blockSlot(
            @Valid @RequestBody BlockSlotRequest request,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                "Saat kapatildi",
                appointmentService.blockSlot(principal.getId(), request.getDate(), request.getTime())
        ));
    }

    @DeleteMapping("/unblock-slot")
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<ApiResponse<Void>> unblockSlot(
            @RequestParam java.time.LocalDate date,
            @RequestParam String time,
            @CurrentUser UserPrincipal principal) {
        appointmentService.unblockSlot(principal.getId(), date, time);
        return ResponseEntity.ok(ApiResponse.success("Saat tekrar acildi", null));
    }

    @GetMapping("/group/{groupId}")
    public ResponseEntity<ApiResponse<List<AppointmentDto>>> getGroup(
            @PathVariable UUID groupId, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                appointmentService.getRecurringGroup(groupId, principal.getId())));
    }

    @DeleteMapping("/group/{groupId}")
    public ResponseEntity<ApiResponse<Void>> cancelGroup(
            @PathVariable UUID groupId, @CurrentUser UserPrincipal principal) {
        appointmentService.cancelRecurringGroup(groupId, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Tekrarlayan seans serisi iptal edildi.", null));
    }

    @PatchMapping("/{id}/rate")
    @PreAuthorize("hasRole('PARENT')")
    public ResponseEntity<ApiResponse<AppointmentDto>> rateAppointment(
            @PathVariable UUID id,
            @RequestParam int rating,
            @RequestParam(required = false) String comment,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                "Randevu degerlendirmesi kaydedildi",
                appointmentService.rateAppointment(id, principal.getId(), rating, comment)
        ));
    }

    @GetMapping("/patients")
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<ApiResponse<List<java.util.Map<String, Object>>>> getPatients(
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(appointmentService.getPatientSummaries(principal.getId())));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<AppointmentHistoryDto>>> getHistory(
            @PathVariable UUID id,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(appointmentService.getHistory(id, principal.getId())));
    }
}
