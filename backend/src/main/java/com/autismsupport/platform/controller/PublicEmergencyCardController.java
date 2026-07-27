package com.autismsupport.platform.controller;

import com.autismsupport.platform.config.RateLimit;
import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.service.EmergencyCardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Acil durum kartının oturum gerektirmeyen okuması. Eskiden kart çocuk
 * kimliğiyle okunuyordu ve oturum açan herkes başkasının çocuğunun sağlık
 * kartına ulaşabiliyordu. Artık erişim yalnızca velinin ürettiği, süreli ve
 * istendiğinde iptal edilebilen paylaşım jetonuyla mümkün.
 */
@RestController
@RequestMapping("/api/public/emergency-card")
@RequiredArgsConstructor
public class PublicEmergencyCardController {

    private final EmergencyCardService service;

    @RateLimit(limit = 30, duration = 60)
    @GetMapping("/{shareToken}")
    public ResponseEntity<ApiResponse<String>> getByToken(@PathVariable String shareToken) {
        return ResponseEntity.ok(ApiResponse.success(service.getCardByShareToken(shareToken)));
    }
}
