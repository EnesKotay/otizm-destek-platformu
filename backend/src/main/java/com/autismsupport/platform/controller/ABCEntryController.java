package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ABCEntryDto;
import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.ABCEntryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/abc-entries")
@RequiredArgsConstructor
public class ABCEntryController {

    private final ABCEntryService abcEntryService;

    @GetMapping("/child/{childId}")
    public ResponseEntity<ApiResponse<List<ABCEntryDto>>> getByChild(
            @PathVariable UUID childId,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(abcEntryService.getByChild(childId, principal.getId())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ABCEntryDto>> create(
            @Valid @RequestBody ABCEntryDto dto,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("ABC kaydi olusturuldu",
                abcEntryService.create(dto, principal.getId())));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ABCEntryDto>> update(
            @PathVariable UUID id,
            @Valid @RequestBody ABCEntryDto dto,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("ABC kaydi guncellendi",
                abcEntryService.update(id, dto, principal.getId())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID id,
            @CurrentUser UserPrincipal principal) {
        abcEntryService.delete(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Kayit silindi", null));
    }
}
