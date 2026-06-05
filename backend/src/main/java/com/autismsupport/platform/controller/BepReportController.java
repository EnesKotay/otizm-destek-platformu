package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.BepReportDto;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.BepReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/bep-reports")
@RequiredArgsConstructor
public class BepReportController {

    private final BepReportService bepReportService;

    @GetMapping("/child/{childId}")
    public ResponseEntity<ApiResponse<List<BepReportDto>>> getByChild(
            @PathVariable UUID childId, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(bepReportService.getByChild(childId, principal.getId())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BepReportDto>> create(
            @Valid @RequestBody BepReportDto dto, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("BEP raporu kaydedildi", bepReportService.create(dto, principal.getId())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID id, @CurrentUser UserPrincipal principal) {
        bepReportService.delete(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("BEP raporu silindi", null));
    }
}
