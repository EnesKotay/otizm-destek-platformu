package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.PushSubscriptionRequest;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.PushSubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/push")
@RequiredArgsConstructor
public class PushController {
    private final PushSubscriptionService pushSubscriptionService;

    @GetMapping({"/vapid-public-key", "/public-key"})
    public ResponseEntity<ApiResponse<Map<String, String>>> getPublicKey() {
        return ResponseEntity.ok(ApiResponse.success(pushSubscriptionService.getVapidPublicKey()));
    }

    @PostMapping("/subscribe")
    public ResponseEntity<ApiResponse<Void>> subscribe(
            @Valid @RequestBody PushSubscriptionRequest request,
            @RequestHeader(value = "User-Agent", required = false) String userAgent,
            @CurrentUser UserPrincipal principal) {
        pushSubscriptionService.subscribe(principal.getId(), request, userAgent);
        return ResponseEntity.ok(ApiResponse.success("Push aboneligi kaydedildi", null));
    }

    @PostMapping("/unsubscribe")
    public ResponseEntity<ApiResponse<Void>> unsubscribe(
            @Valid @RequestBody PushSubscriptionRequest request,
            @CurrentUser UserPrincipal principal) {
        pushSubscriptionService.unsubscribe(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Push aboneligi kaldirildi", null));
    }
}
