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
    private final com.autismsupport.platform.repository.UserRepository userRepository;
    private final com.autismsupport.platform.repository.UserBlockRepository userBlockRepository;

    @GetMapping("/{userId}/online-status")
    public ResponseEntity<ApiResponse<Boolean>> getOnlineStatus(@PathVariable UUID userId, @com.autismsupport.platform.security.CurrentUser com.autismsupport.platform.security.UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(canShow(userId, principal) && userPresenceService.isUserOnline(userId)));
    }

    @PostMapping("/online-status/batch")
    public ResponseEntity<ApiResponse<java.util.Map<UUID, Boolean>>> getOnlineStatusBatch(@RequestBody java.util.List<UUID> userIds, @com.autismsupport.platform.security.CurrentUser com.autismsupport.platform.security.UserPrincipal principal) {
        java.util.Map<UUID, Boolean> result = new java.util.HashMap<>();
        if (userIds != null) userIds.forEach(id -> result.put(id, canShow(id, principal) && userPresenceService.isUserOnline(id)));
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    private boolean canShow(UUID userId, com.autismsupport.platform.security.UserPrincipal principal) {
        if (principal == null) return false;
        if (userBlockRepository.existsBetween(principal.getId(), userId)) return false;
        return userRepository.findById(userId).map(user -> !user.isHideOnlineStatus()).orElse(false);
    }
}
