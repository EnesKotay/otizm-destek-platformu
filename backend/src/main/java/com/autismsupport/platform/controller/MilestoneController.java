package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.MilestoneDto;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.MilestoneService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/milestones")
@RequiredArgsConstructor
public class MilestoneController {

    private final MilestoneService milestoneService;

    @GetMapping("/child/{childId}")
    public ResponseEntity<ApiResponse<List<MilestoneDto>>> getMilestones(
            @PathVariable UUID childId, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(milestoneService.getMilestonesByChild(childId, principal.getId())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MilestoneDto>> createMilestone(
            @Valid @RequestBody MilestoneDto dto, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Milestone olusturuldu", milestoneService.createMilestone(dto, principal.getId())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteMilestone(@PathVariable UUID id, @CurrentUser UserPrincipal principal) {
        milestoneService.deleteMilestone(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Milestone silindi", null));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<MilestoneDto>> updateMilestone(
            @PathVariable UUID id, @Valid @RequestBody MilestoneDto dto, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Milestone güncellendi", milestoneService.updateMilestone(id, dto, principal.getId())));
    }
}
