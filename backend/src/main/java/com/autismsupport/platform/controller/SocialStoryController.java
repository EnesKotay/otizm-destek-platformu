package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.SocialStoryDto;
import com.autismsupport.platform.exception.AuthenticationRequiredException;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.SocialStoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/social-stories")
@RequiredArgsConstructor
public class SocialStoryController {

    private final SocialStoryService socialStoryService;

    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<List<SocialStoryDto>>> getMine(@CurrentUser UserPrincipal principal) {
        if (principal == null) {
            throw new AuthenticationRequiredException("Oturum süresi dolmuş veya geçersiz. Lütfen tekrar giriş yapın.");
        }
        return ResponseEntity.ok(ApiResponse.success(socialStoryService.getMyStories(principal.getId())));
    }

    @GetMapping("/public")
    public ResponseEntity<ApiResponse<List<SocialStoryDto>>> getPublic(
            @RequestParam(required = false) String category) {
        return ResponseEntity.ok(ApiResponse.success(socialStoryService.getPublicStories(category)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SocialStoryDto>> getById(
            @PathVariable UUID id, @CurrentUser UserPrincipal principal) {
        UUID requesterId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(ApiResponse.success(socialStoryService.getById(id, requesterId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SocialStoryDto>> create(
            @Valid @RequestBody SocialStoryDto dto, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Hikaye olusturuldu", socialStoryService.create(dto, principal.getId())));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SocialStoryDto>> update(
            @PathVariable UUID id, @Valid @RequestBody SocialStoryDto dto, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Hikaye guncellendi", socialStoryService.update(id, dto, principal.getId())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID id, @CurrentUser UserPrincipal principal) {
        socialStoryService.delete(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Hikaye silindi", null));
    }

    // --- Comments ---

    @GetMapping("/{id}/comments")
    public ResponseEntity<ApiResponse<List<com.autismsupport.platform.dto.SocialStoryCommentDto>>> getComments(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(socialStoryService.getComments(id)));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<ApiResponse<com.autismsupport.platform.dto.SocialStoryCommentDto>> addComment(
            @PathVariable UUID id,
            @Valid @RequestBody com.autismsupport.platform.dto.CreateSocialStoryCommentRequest request,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Yorum eklendi", socialStoryService.addComment(id, request, principal.getId())));
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable UUID commentId, @CurrentUser UserPrincipal principal) {
        socialStoryService.deleteComment(commentId, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Yorum silindi", null));
    }
}
