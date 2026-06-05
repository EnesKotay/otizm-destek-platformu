package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.KnowledgeArticleDto;
import com.autismsupport.platform.dto.ExpertAnalyticsDto;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.KnowledgeArticleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/knowledge")
@RequiredArgsConstructor
public class KnowledgeArticleController {
    private final KnowledgeArticleService service;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<KnowledgeArticleDto>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                service.getPublishedArticles(PageRequest.of(page, size, Sort.by("createdAt").descending()))));
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<ApiResponse<Page<KnowledgeArticleDto>>> getByCategory(
            @PathVariable String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                service.getByCategory(category, PageRequest.of(page, size))));
    }

    @GetMapping("/format/{format}")
    public ResponseEntity<ApiResponse<Page<KnowledgeArticleDto>>> getByFormat(
            @PathVariable String format,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                service.getByFormat(format, PageRequest.of(page, size))));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<KnowledgeArticleDto>> getOne(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(service.getArticle(id)));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<Page<KnowledgeArticleDto>>> getMy(
            @CurrentUser UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                service.getMyArticles(principal.getId(), PageRequest.of(page, size))));
    }

    @GetMapping("/my-analytics")
    public ResponseEntity<ApiResponse<ExpertAnalyticsDto>> getMyAnalytics(@CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(service.getMyAnalytics(principal.getId())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<KnowledgeArticleDto>> create(
            @Valid @RequestBody KnowledgeArticleDto dto,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Makale olusturuldu", service.createArticle(dto, principal.getId())));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<KnowledgeArticleDto>> update(
            @PathVariable UUID id,
            @Valid @RequestBody KnowledgeArticleDto dto,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Makale guncellendi", service.updateArticle(id, dto, principal.getId())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID id,
            @CurrentUser UserPrincipal principal) {
        service.deleteArticle(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Makale silindi", null));
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<ApiResponse<KnowledgeArticleDto>> togglePublish(
            @PathVariable UUID id,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(service.togglePublish(id, principal.getId())));
    }
}
