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

    private UserPrincipal requireUser(UserPrincipal principal) {
        if (principal == null) {
            throw new com.autismsupport.platform.exception.UnauthorizedException("Lütfen önce giriş yapın");
        }
        return principal;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ChildDto>>> getChildren(@CurrentUser UserPrincipal principal) {
        UserPrincipal user = requireUser(principal);
        return ResponseEntity.ok(ApiResponse.success(childService.getChildrenByParent(user.getId())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ChildDto>> getChild(@PathVariable UUID id, @CurrentUser UserPrincipal principal) {
        UserPrincipal user = requireUser(principal);
        return ResponseEntity.ok(ApiResponse.success(childService.getChild(id, user.getId(), user.getRole())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ChildDto>> createChild(
            @Valid @RequestBody ChildDto dto, @CurrentUser UserPrincipal principal) {
        UserPrincipal user = requireUser(principal);
        return ResponseEntity.ok(ApiResponse.success("Cocuk profili olusturuldu", childService.createChild(dto, user.getId())));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ChildDto>> updateChild(
            @PathVariable UUID id, @Valid @RequestBody ChildDto dto, @CurrentUser UserPrincipal principal) {
        UserPrincipal user = requireUser(principal);
        return ResponseEntity.ok(ApiResponse.success("Cocuk profili guncellendi", childService.updateChild(id, dto, user.getId())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteChild(@PathVariable UUID id, @CurrentUser UserPrincipal principal) {
        UserPrincipal user = requireUser(principal);
        childService.deleteChild(id, user.getId());
        return ResponseEntity.ok(ApiResponse.success("Cocuk profili silindi", null));
    }
}
