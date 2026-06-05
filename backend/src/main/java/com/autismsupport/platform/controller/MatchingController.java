package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.SimilarFamilyDto;
import com.autismsupport.platform.exception.AuthenticationRequiredException;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.MatchingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/matching")
@RequiredArgsConstructor
public class MatchingController {

    private final MatchingService matchingService;

    @GetMapping("/similar/{childId}")
    public ResponseEntity<ApiResponse<List<SimilarFamilyDto>>> findSimilarFamilies(
            @PathVariable UUID childId,
            @RequestParam(defaultValue = "0.05") double minScore,
            @RequestParam(required = false) String ageGroup,
            @RequestParam(defaultValue = "score") String sortBy,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                matchingService.findSimilarFamilies(childId, requireUserId(principal),
                        minScore, ageGroup, sortBy)));
    }

    @PutMapping("/opt-out")
    public ResponseEntity<ApiResponse<Boolean>> toggleMatching(@CurrentUser UserPrincipal principal) {
        boolean enabled = matchingService.toggleMatching(requireUserId(principal));
        return ResponseEntity.ok(ApiResponse.success(enabled));
    }

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<Boolean>> getMatchingStatus(@CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(matchingService.isMatchingEnabled(requireUserId(principal))));
    }

    private UUID requireUserId(UserPrincipal principal) {
        if (principal == null) {
            throw new AuthenticationRequiredException("Oturum süresi dolmuş veya geçersiz. Lütfen tekrar giriş yapın.");
        }
        return principal.getId();
    }
}
