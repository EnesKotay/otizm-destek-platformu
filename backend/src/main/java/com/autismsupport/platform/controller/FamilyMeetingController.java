package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.FamilyMeetingDto;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.FamilyMeetingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.Map;

@RestController
@RequestMapping("/api/family-meetings")
@RequiredArgsConstructor
public class FamilyMeetingController {

    private final FamilyMeetingService service;

    @GetMapping
    @PreAuthorize("hasRole('PARENT')")
    public ResponseEntity<ApiResponse<List<FamilyMeetingDto>>> getMyMeetings(@CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(service.getMeetingsForUser(principal.getId())));
    }

    @PostMapping
    @PreAuthorize("hasRole('PARENT')")
    public ResponseEntity<ApiResponse<FamilyMeetingDto>> createMeeting(
            @Valid @RequestBody FamilyMeetingDto dto,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Görüşme talebi gönderildi", service.createMeeting(dto, principal.getId())));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('PARENT')")
    public ResponseEntity<ApiResponse<FamilyMeetingDto>> updateStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                "Görüşme durumu güncellendi", 
                service.updateMeetingStatus(id, body.get("status"), principal.getId())
        ));
    }
}
