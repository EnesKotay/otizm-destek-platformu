package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.MoodEntryDto;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.MoodEntryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/mood")
@RequiredArgsConstructor
public class MoodEntryController {

    private final MoodEntryService moodEntryService;

    @GetMapping("/child/{childId}")
    public ResponseEntity<ApiResponse<List<MoodEntryDto>>> getEntries(
            @PathVariable UUID childId, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(moodEntryService.getEntries(childId, principal.getId())));
    }

    @GetMapping("/child/{childId}/range")
    public ResponseEntity<ApiResponse<List<MoodEntryDto>>> getRange(
            @PathVariable UUID childId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(moodEntryService.getEntriesRange(childId, from, to, principal.getId())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MoodEntryDto>> upsert(
            @Valid @RequestBody MoodEntryDto dto, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Ruh hali kaydedildi", moodEntryService.upsert(dto, principal.getId())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID id, @CurrentUser UserPrincipal principal) {
        moodEntryService.delete(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Kayit silindi", null));
    }
}
