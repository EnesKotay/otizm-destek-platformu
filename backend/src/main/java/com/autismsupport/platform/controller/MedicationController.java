package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.MedicationDto;
import com.autismsupport.platform.dto.MedicationLogDto;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.MedicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/medications")
@RequiredArgsConstructor
public class MedicationController {

    private final MedicationService medicationService;

    @GetMapping("/child/{childId}")
    public ResponseEntity<ApiResponse<List<MedicationDto>>> getMedications(
            @PathVariable UUID childId, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(medicationService.getMedications(childId, principal.getId())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MedicationDto>> create(
            @Valid @RequestBody MedicationDto dto, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Ilac eklendi", medicationService.createMedication(dto, principal.getId())));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<MedicationDto>> update(
            @PathVariable UUID id, @Valid @RequestBody MedicationDto dto, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Ilac guncellendi", medicationService.updateMedication(id, dto, principal.getId())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID id, @CurrentUser UserPrincipal principal) {
        medicationService.deleteMedication(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Ilac silindi", null));
    }

    @PostMapping("/{id}/toggle")
    public ResponseEntity<ApiResponse<MedicationLogDto>> toggle(
            @PathVariable UUID id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false, defaultValue = "") String time,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(medicationService.toggleLog(id, date, time, principal.getId())));
    }
}
