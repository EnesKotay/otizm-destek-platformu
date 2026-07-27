package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.EmergencyCardService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
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
    private final ObjectMapper objectMapper;

    @GetMapping("/{childId}")
    public ResponseEntity<ApiResponse<String>> get(@PathVariable UUID childId, @CurrentUser UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.success(service.getCard(childId, p.getId())));
    }

    @PutMapping("/{childId}")
    public ResponseEntity<ApiResponse<Void>> save(@PathVariable UUID childId,
            @RequestBody Map<String, Object> body, @CurrentUser UserPrincipal p) throws JsonProcessingException {
        service.saveCard(childId, p.getId(), objectMapper.writeValueAsString(body));
        return ResponseEntity.ok(ApiResponse.success("Kaydedildi", null));
    }

    @GetMapping("/{childId}/share")
    public ResponseEntity<ApiResponse<Map<String, Object>>> shareStatus(
            @PathVariable UUID childId, @CurrentUser UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.success(service.shareStatus(childId, p.getId())));
    }

    @PostMapping("/{childId}/share")
    public ResponseEntity<ApiResponse<Map<String, Object>>> enableShare(
            @PathVariable UUID childId,
            @RequestParam(required = false) Integer hours,
            @CurrentUser UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.success(
                "Paylaşım bağlantısı oluşturuldu", service.enableSharing(childId, p.getId(), hours)));
    }

    @DeleteMapping("/{childId}/share")
    public ResponseEntity<ApiResponse<Void>> disableShare(
            @PathVariable UUID childId, @CurrentUser UserPrincipal p) {
        service.disableSharing(childId, p.getId());
        return ResponseEntity.ok(ApiResponse.success("Paylaşım kapatıldı", null));
    }
}
