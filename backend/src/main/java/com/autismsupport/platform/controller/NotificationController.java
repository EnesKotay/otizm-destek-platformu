package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.NotificationDto;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationDto>>> getRecent(@CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(service.getLatest(principal.getId())));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount(@CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(Map.of("count", service.getUnreadCount(principal.getId()))));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markRead(
            @PathVariable UUID id,
            @CurrentUser UserPrincipal principal) {
        service.markAsRead(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PutMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllRead(@CurrentUser UserPrincipal principal) {
        service.markAllRead(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
