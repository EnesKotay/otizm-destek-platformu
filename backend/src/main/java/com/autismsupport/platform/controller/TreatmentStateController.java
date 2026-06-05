package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.TreatmentStateDto;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.TreatmentStateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/treatment-state")
@RequiredArgsConstructor
public class TreatmentStateController {

    private final TreatmentStateService treatmentStateService;

    @GetMapping("/{childId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<TreatmentStateDto> get(
            @PathVariable UUID childId,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(treatmentStateService.get(childId, principal.getId()));
    }

    @PutMapping("/{childId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<TreatmentStateDto> save(
            @PathVariable UUID childId,
            @RequestBody TreatmentStateDto dto,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(treatmentStateService.save(childId, dto, principal.getId()));
    }
}
