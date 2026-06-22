package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.AnalyticsTrendDto;
import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/child/{childId}/trends")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<AnalyticsTrendDto>> getChildTrends(
            @PathVariable UUID childId,
            @RequestParam(defaultValue = "6") int months,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                analyticsService.getChildTrends(childId, months, principal.getId(), principal.getRole())));
    }
}
