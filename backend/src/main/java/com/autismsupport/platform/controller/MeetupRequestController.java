package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.MeetupRequestDto;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.MeetupRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/meetup-requests")
@RequiredArgsConstructor
public class MeetupRequestController {

    private final MeetupRequestService service;

    @GetMapping
    @PreAuthorize("hasRole('PARENT')")
    public ResponseEntity<ApiResponse<List<MeetupRequestDto>>> getMyRequests(@CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(service.getRequestsForUser(principal.getId())));
    }

    @PostMapping
    @PreAuthorize("hasRole('PARENT')")
    public ResponseEntity<ApiResponse<MeetupRequestDto>> createRequest(
            @Valid @RequestBody MeetupRequestDto dto,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Buluşma isteği gönderildi", service.createRequest(dto, principal.getId())));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('PARENT')")
    public ResponseEntity<ApiResponse<MeetupRequestDto>> updateStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                "Buluşma isteği güncellendi",
                service.updateStatus(id, body.get("status"), principal.getId())
        ));
    }
}
