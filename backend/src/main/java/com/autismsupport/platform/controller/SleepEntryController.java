package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.SleepEntryDto;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.SleepEntryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/sleep")
@RequiredArgsConstructor
public class SleepEntryController {

    private final SleepEntryService sleepEntryService;

    @GetMapping("/child/{childId}")
    public ResponseEntity<ApiResponse<List<SleepEntryDto>>> getEntries(
            @PathVariable UUID childId, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(sleepEntryService.getEntries(childId, principal.getId())));
    }

    @GetMapping("/child/{childId}/range")
    public ResponseEntity<ApiResponse<List<SleepEntryDto>>> getRange(
            @PathVariable UUID childId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(sleepEntryService.getEntriesRange(childId, from, to, principal.getId())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SleepEntryDto>> upsert(
            @Valid @RequestBody SleepEntryDto dto, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Uyku kaydedildi", sleepEntryService.upsert(dto, principal.getId())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID id, @CurrentUser UserPrincipal principal) {
        sleepEntryService.delete(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Kayit silindi", null));
    }
}
