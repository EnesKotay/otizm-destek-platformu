package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.ClinicalShareDto;
import com.autismsupport.platform.model.ClinicalDataShare;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.ClinicalDataShareService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/clinical-shares")
@RequiredArgsConstructor
public class ClinicalDataShareController {

    private final ClinicalDataShareService shareService;

    @PostMapping
    public ResponseEntity<ApiResponse<ClinicalDataShare>> grantSharePermission(
            @RequestBody ClinicalShareDto dto,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                shareService.grantSharePermission(principal.getId(), dto)
        ));
    }

    @PostMapping("/revoke/{id}")
    public ResponseEntity<ApiResponse<Void>> revokeSharePermission(
            @PathVariable UUID id,
            @CurrentUser UserPrincipal principal) {
        shareService.revokeSharePermission(principal.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Paylasim izni iptal edildi.", null));
    }

    @GetMapping("/my-list")
    public ResponseEntity<ApiResponse<List<ClinicalShareDto>>> getMyShares(@CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(shareService.getMyShares(principal.getId())));
    }

    @GetMapping("/expert/patients")
    public ResponseEntity<ApiResponse<List<ClinicalShareDto>>> getSharedPatients(@CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(shareService.getSharedPatients(principal.getId())));
    }
}
