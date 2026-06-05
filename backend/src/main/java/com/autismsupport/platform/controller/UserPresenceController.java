package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.service.UserPresenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserPresenceController {

    private final UserPresenceService userPresenceService;

    @GetMapping("/{userId}/online-status")
    public ResponseEntity<ApiResponse<Boolean>> getOnlineStatus(@PathVariable UUID userId) {
        return ResponseEntity.ok(ApiResponse.success(userPresenceService.isUserOnline(userId)));
    }

    @PostMapping("/online-status/batch")
    public ResponseEntity<ApiResponse<java.util.Map<UUID, Boolean>>> getOnlineStatusBatch(@RequestBody java.util.List<UUID> userIds) {
        return ResponseEntity.ok(ApiResponse.success(userPresenceService.getOnlineStatusBatch(userIds)));
    }
}
