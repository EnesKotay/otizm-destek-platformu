package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.ArticleCommentDto;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.ArticleCommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/knowledge/{articleId}/comments")
@RequiredArgsConstructor
public class ArticleCommentController {
    private final ArticleCommentService service;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ArticleCommentDto>>> getComments(
            @PathVariable UUID articleId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(service.getComments(articleId, PageRequest.of(page, size))));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ArticleCommentDto>> addComment(
            @PathVariable UUID articleId,
            @RequestBody ArticleCommentDto dto,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Yorum eklendi", service.addComment(articleId, dto, principal.getId())));
    }
}
