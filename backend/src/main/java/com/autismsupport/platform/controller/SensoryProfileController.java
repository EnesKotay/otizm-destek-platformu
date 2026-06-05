package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.SensoryProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import com.autismsupport.platform.dto.SensoryProfileRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/sensory-profile")
@RequiredArgsConstructor
public class SensoryProfileController {

    private final SensoryProfileService service;

    @GetMapping("/{childId}")
    public ResponseEntity<ApiResponse<String>> get(@PathVariable UUID childId, @CurrentUser UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.success(service.getProfile(childId, p.getId())));
    }

    @PutMapping("/{childId}")
    public ResponseEntity<ApiResponse<Void>> save(@PathVariable UUID childId,
            @Valid @RequestBody SensoryProfileRequest request, @CurrentUser UserPrincipal p) throws Exception {
        String json = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(request.getDomains());
        service.saveProfile(childId, p.getId(), json);
        return ResponseEntity.ok(ApiResponse.success("Kaydedildi", null));
    }
}
