package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.ForumCommentDto;
import com.autismsupport.platform.dto.ForumPostDto;
import com.autismsupport.platform.dto.PageResponseDto;
import com.autismsupport.platform.exception.AuthenticationRequiredException;
import com.autismsupport.platform.exception.ValidationException;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.ForumService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/forum")
@RequiredArgsConstructor
public class ForumController {

    private final ForumService forumService;

    @GetMapping({"", "/"})
    public ResponseEntity<ApiResponse<PageResponseDto<ForumPostDto>>> getForumRoot(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Set<String> tagIds,
            @RequestParam(required = false) String q,
            @RequestParam(name = "order", required = false, defaultValue = "new") String sort,
            @CurrentUser UserPrincipal principal,
            Pageable pageable) {

        return getPosts(type, tagIds, q, sort, principal, pageable);
    }

    @GetMapping("/posts")
    public ResponseEntity<ApiResponse<PageResponseDto<ForumPostDto>>> getPosts(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Set<String> tagIds,
            @RequestParam(required = false) String q,
            @RequestParam(name = "order", required = false, defaultValue = "new") String sort,
            @CurrentUser UserPrincipal principal,
            Pageable pageable) {

        UUID userId = principal != null ? principal.getId() : null;
        Set<UUID> tagUuids = parseTagIds(tagIds);

        return ResponseEntity.ok(ApiResponse.success(
                PageResponseDto.from(forumService.getPostsByFilters(type, tagUuids, q, sort, pageable, userId))));
    }

    @GetMapping("/posts/category/{category}")
    public ResponseEntity<ApiResponse<PageResponseDto<ForumPostDto>>> getPostsByCategory(
            @PathVariable String category, @CurrentUser UserPrincipal principal, Pageable pageable) {
        UUID userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(ApiResponse.success(
                PageResponseDto.from(forumService.getPostsByCategory(category, pageable, userId))));
    }

    @GetMapping("/featured")
    public ResponseEntity<ApiResponse<PageResponseDto<ForumPostDto>>> getFeatured(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @CurrentUser UserPrincipal principal) {
        UUID userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(ApiResponse.success(
                PageResponseDto.from(forumService.getFeaturedPosts(PageRequest.of(page, size), userId))));
    }

    @PutMapping("/{id}/feature")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ForumPostDto>> toggleFeatured(
            @PathVariable UUID id,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                "Gonderi one cikarilma durumu degistirildi", 
                forumService.toggleFeatured(id, principal.getId())));
    }

    @GetMapping("/posts/unanswered")
    public ResponseEntity<ApiResponse<PageResponseDto<ForumPostDto>>> getUnansweredQuestions(
            @CurrentUser UserPrincipal principal, Pageable pageable) {
        UUID userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(ApiResponse.success(
                PageResponseDto.from(forumService.getUnansweredQuestions(pageable, userId))));
    }

    @GetMapping("/posts/{id}")
    public ResponseEntity<ApiResponse<ForumPostDto>> getPost(
            @PathVariable UUID id, @CurrentUser UserPrincipal principal) {
        UUID userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(ApiResponse.success(forumService.getPost(id, userId)));
    }

    @PostMapping("/posts")
    public ResponseEntity<ApiResponse<ForumPostDto>> createPost(
            @Valid @RequestBody ForumPostDto dto, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Gonderi olusturuldu",
                forumService.createPost(dto, requireUserId(principal))));
    }

    @PutMapping("/posts/{id}")
    public ResponseEntity<ApiResponse<ForumPostDto>> updatePost(
            @PathVariable UUID id, @Valid @RequestBody ForumPostDto dto, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Gonderi guncellendi",
                forumService.updatePost(id, dto, requireUserId(principal))));
    }

    @DeleteMapping("/posts/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePost(
            @PathVariable UUID id, @CurrentUser UserPrincipal principal) {
        forumService.deletePost(id, requireUserId(principal));
        return ResponseEntity.ok(ApiResponse.success("Gonderi silindi", null));
    }

    @PostMapping("/posts/{postId}/accept/{commentId}")
    public ResponseEntity<ApiResponse<ForumPostDto>> acceptAnswer(
            @PathVariable UUID postId, @PathVariable UUID commentId, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Cevap kabul edildi",
                forumService.acceptAnswer(postId, commentId, requireUserId(principal))));
    }

    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<ApiResponse<PageResponseDto<ForumCommentDto>>> getComments(
            @PathVariable UUID postId, @CurrentUser UserPrincipal principal, Pageable pageable) {
        UUID userId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(ApiResponse.success(
                PageResponseDto.from(forumService.getComments(postId, pageable, userId))));
    }

    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<ApiResponse<ForumCommentDto>> createComment(
            @PathVariable UUID postId,
            @Valid @RequestBody ForumCommentDto dto, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Yorum olusturuldu",
                forumService.createComment(postId, dto, requireUserId(principal))));
    }

    @PutMapping("/posts/{postId}/comments/{commentId}")
    public ResponseEntity<ApiResponse<ForumCommentDto>> updateComment(
            @PathVariable UUID postId,
            @PathVariable UUID commentId,
            @Valid @RequestBody ForumCommentDto dto,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Yorum guncellendi",
                forumService.updateComment(postId, commentId, dto, requireUserId(principal))));
    }

    @DeleteMapping("/posts/{postId}/comments/{commentId}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable UUID postId,
            @PathVariable UUID commentId,
            @CurrentUser UserPrincipal principal) {
        forumService.deleteComment(postId, commentId, requireUserId(principal), principal.getRole());
        return ResponseEntity.ok(ApiResponse.success("Yorum silindi", null));
    }

    private UUID requireUserId(UserPrincipal principal) {
        if (principal == null) {
            throw new AuthenticationRequiredException("Oturum süresi dolmuş veya geçersiz. Lütfen tekrar giriş yapın.");
        }
        return principal.getId();
    }

    private Set<UUID> parseTagIds(Set<String> tagIds) {
        if (tagIds == null || tagIds.isEmpty()) {
            return Collections.emptySet();
        }
        try {
            return tagIds.stream().map(UUID::fromString).collect(Collectors.toSet());
        } catch (IllegalArgumentException ex) {
            throw new ValidationException("Geçersiz etiket kimliği gönderildi.");
        }
    }
}
