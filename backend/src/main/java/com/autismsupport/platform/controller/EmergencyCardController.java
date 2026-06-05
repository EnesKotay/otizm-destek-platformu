package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.EmergencyCardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/emergency-card")
@RequiredArgsConstructor
public class EmergencyCardController {

    private final EmergencyCardService service;

    @GetMapping("/{childId}")
    public ResponseEntity<ApiResponse<String>> get(@PathVariable UUID childId, @CurrentUser UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.success(service.getCard(childId, p.getId())));
    }

    @GetMapping("/public/{childId}")
    public ResponseEntity<ApiResponse<String>> getPublic(@PathVariable UUID childId) {
        // We will just fetch the card by childId. We need a method in service for this without userId check.
        // Or if we don't have it, we'll create it or use a repository if we have one. Let's just use service.getCardPublic
        return ResponseEntity.ok(ApiResponse.success(service.getCardPublic(childId)));
    }

    @PutMapping("/{childId}")
    public ResponseEntity<ApiResponse<Void>> save(@PathVariable UUID childId,
            @RequestBody Map<String, Object> body, @CurrentUser UserPrincipal p) throws Exception {
        String json = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(body);
        service.saveCard(childId, p.getId(), json);
        return ResponseEntity.ok(ApiResponse.success("Kaydedildi", null));
    }
}
