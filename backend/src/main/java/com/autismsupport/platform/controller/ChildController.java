package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.ChildDto;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.ChildService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/children")
@RequiredArgsConstructor
public class ChildController {

    private final ChildService childService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ChildDto>>> getChildren(@CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(childService.getChildrenByParent(principal.getId())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ChildDto>> getChild(@PathVariable UUID id, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(childService.getChild(id, principal.getId())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ChildDto>> createChild(
            @Valid @RequestBody ChildDto dto, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Cocuk profili olusturuldu", childService.createChild(dto, principal.getId())));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ChildDto>> updateChild(
            @PathVariable UUID id, @Valid @RequestBody ChildDto dto, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Cocuk profili guncellendi", childService.updateChild(id, dto, principal.getId())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteChild(@PathVariable UUID id, @CurrentUser UserPrincipal principal) {
        childService.deleteChild(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Cocuk profili silindi", null));
    }
}
