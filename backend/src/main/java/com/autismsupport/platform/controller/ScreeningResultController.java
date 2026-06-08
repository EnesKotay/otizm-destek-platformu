package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.ScreeningResultDto;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.ScreeningResultService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/screening")
@RequiredArgsConstructor
public class ScreeningResultController {

    private final ScreeningResultService screeningResultService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ScreeningResultDto>>> getAllResults(
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                screeningResultService.getAllResultsByParent(principal.getId())));
    }

    @GetMapping("/child/{childId}")
    public ResponseEntity<ApiResponse<List<ScreeningResultDto>>> getResultsByChild(
            @PathVariable UUID childId, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                screeningResultService.getResultsByChild(childId, principal.getId(), principal.getRole())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ScreeningResultDto>> saveResult(
            @Valid @RequestBody ScreeningResultDto dto, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Tarama sonucu kaydedildi",
                screeningResultService.saveResult(dto, principal.getId())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteResult(
            @PathVariable UUID id, @CurrentUser UserPrincipal principal) {
        screeningResultService.deleteResult(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Tarama sonucu silindi", null));
    }
}
