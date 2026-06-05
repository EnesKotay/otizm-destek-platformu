package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.WellbeingEntryDto;
import com.autismsupport.platform.exception.AuthenticationRequiredException;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.WellbeingEntryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/wellbeing")
@RequiredArgsConstructor
public class WellbeingEntryController {

    private final WellbeingEntryService wellbeingEntryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<WellbeingEntryDto>>> getAll(
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(wellbeingEntryService.getAll(requireUserId(principal))));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WellbeingEntryDto>> upsert(
            @Valid @RequestBody WellbeingEntryDto dto,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Refah kaydedildi",
                wellbeingEntryService.upsert(dto, requireUserId(principal))));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID id,
            @CurrentUser UserPrincipal principal) {
        wellbeingEntryService.delete(id, requireUserId(principal));
        return ResponseEntity.ok(ApiResponse.success("Kayit silindi", null));
    }

    private UUID requireUserId(UserPrincipal principal) {
        if (principal == null) {
            throw new AuthenticationRequiredException("Oturum süresi dolmuş veya geçersiz. Lütfen tekrar giriş yapın.");
        }
        return principal.getId();
    }
}
