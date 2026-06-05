package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.service.AiInsightsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/ai-insights")
@RequiredArgsConstructor
public class AiInsightsController {

    private final AiInsightsService aiInsightsService;

    @GetMapping("/{childId}")
    public ResponseEntity<ApiResponse<String>> getInsights(@PathVariable UUID childId) {
        String insights = aiInsightsService.generateCorrelations(childId);
        return ResponseEntity.ok(ApiResponse.success(insights));
    }
}
