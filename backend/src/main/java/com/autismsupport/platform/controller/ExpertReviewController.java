package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.ExpertReviewDto;
import com.autismsupport.platform.model.ExpertReview;
import com.autismsupport.platform.repository.ExpertReviewRepository;
import com.autismsupport.platform.repository.UserRepository;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/experts/{expertId}/reviews")
@RequiredArgsConstructor
public class ExpertReviewController {

    private final ExpertReviewRepository reviewRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getReviews(@PathVariable UUID expertId) {
        List<ExpertReviewDto> reviews = reviewRepository
                .findByExpertIdOrderByCreatedAtDesc(expertId)
                .stream().map(this::toDto).toList();
        Double avg = reviewRepository.findAverageRatingByExpertId(expertId);
        long count = reviewRepository.countByExpertId(expertId);
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "reviews", reviews,
                "averageRating", avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0,
                "totalCount", count
        )));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ExpertReviewDto>> createOrUpdate(
            @PathVariable UUID expertId,
            @RequestBody ExpertReviewDto body,
            @CurrentUser UserPrincipal principal) {

        if (body.getRating() < 1 || body.getRating() > 5) {
            throw new IllegalArgumentException("Puan 1-5 arasinda olmalidir");
        }

        var expert = userRepository.findById(expertId)
                .orElseThrow(() -> new RuntimeException("Uzman bulunamadi"));
        var reviewer = userRepository.findById(principal.getId())
                .orElseThrow(() -> new RuntimeException("Kullanici bulunamadi"));

        var existing = reviewRepository.findByExpertIdAndReviewerId(expertId, reviewer.getId());
        ExpertReview review = existing.orElse(ExpertReview.builder()
                .expert(expert).reviewer(reviewer).build());

        review.setRating(body.getRating());
        review.setComment(body.getComment());
        ExpertReview saved = reviewRepository.save(review);

        return ResponseEntity.ok(ApiResponse.success(toDto(saved)));
    }

    @DeleteMapping("/{reviewId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID expertId,
            @PathVariable UUID reviewId,
            @CurrentUser UserPrincipal principal) {

        var review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Degerlendirme bulunamadi"));
        if (!review.getReviewer().getId().equals(principal.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("Bu degerlendirme size ait degil");
        }
        reviewRepository.delete(review);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    private ExpertReviewDto toDto(ExpertReview r) {
        return ExpertReviewDto.builder()
                .id(r.getId())
                .expertId(r.getExpert().getId())
                .reviewerId(r.getReviewer().getId())
                .reviewerName(r.getReviewer().getFullName())
                .reviewerImageUrl(r.getReviewer().getProfileImageUrl())
                .rating(r.getRating())
                .comment(r.getComment())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
