package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.ExpertProfileUpdateRequest;
import com.autismsupport.platform.dto.UserDto;
import com.autismsupport.platform.model.UserRole;
import com.autismsupport.platform.repository.KnowledgeArticleRepository;
import com.autismsupport.platform.repository.KnowledgeArticleRepository.ArticleCountProjection;
import com.autismsupport.platform.repository.UserRepository;
import com.autismsupport.platform.repository.ExpertReviewRepository;
import com.autismsupport.platform.repository.ExpertReviewRepository.ExpertRatingStatsProjection;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/experts")
@RequiredArgsConstructor
public class ExpertController {
    private final UserRepository userRepository;
    private final KnowledgeArticleRepository articleRepository;
    private final ExpertReviewRepository reviewRepository;
    private final com.autismsupport.platform.service.PatientService patientService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserDto>>> getExperts(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String specialization) {

        var allExperts = userRepository.findByRole(UserRole.EXPERT).stream()
                .filter(u -> u.isVerified())
                .filter(u -> city == null || city.isBlank() ||
                        (u.getCity() != null && u.getCity().equalsIgnoreCase(city)))
                .filter(u -> specialization == null || specialization.isBlank() ||
                        (u.getSpecializations() != null && u.getSpecializations().stream()
                                .anyMatch(s -> s.toLowerCase().contains(specialization.toLowerCase()))))
                .toList();

        if (allExperts.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(List.of()));
        }

        List<UUID> ids = allExperts.stream().map(u -> u.getId()).toList();

        Map<UUID, ExpertRatingStatsProjection> ratingStats = reviewRepository
                .findRatingStatsByExpertIds(ids)
                .stream()
                .collect(Collectors.toMap(ExpertRatingStatsProjection::getExpertId, p -> p));

        Map<UUID, Long> articleCounts = articleRepository
                .findArticleCountsByAuthorIds(ids)
                .stream()
                .collect(Collectors.toMap(ArticleCountProjection::getAuthorId, ArticleCountProjection::getArticleCount));

        List<UserDto> experts = allExperts.stream()
                .map(u -> {
                    ExpertRatingStatsProjection stats = ratingStats.get(u.getId());
                    return UserDto.builder()
                        .id(u.getId())
                        .fullName(u.getFullName())
                        .role(u.getRole().name())
                        .expertTitle(u.getExpertTitle())
                        .verified(u.isVerified())
                        .licenseVerified(u.isLicenseVerified())
                        .profileImageUrl(u.getProfileImageUrl())
                        .specializations(u.getSpecializations())
                        .institution(u.getInstitution())
                        .city(u.getCity())
                        .bio(u.getBio())
                        .createdAt(u.getCreatedAt())
                        .avgRating(stats != null && stats.getAvgRating() != null ? stats.getAvgRating() : 0.0)
                        .reviewCount(stats != null && stats.getReviewCount() != null ? stats.getReviewCount() : 0L)
                        .articleCount(articleCounts.getOrDefault(u.getId(), 0L))
                        .acceptingPatients(u.isAcceptingPatients())
                        .ageGroups(u.getAgeGroups())
                        .supportTopics(u.getSupportTopics())
                        .spokenLanguages(u.getSpokenLanguages())
                        .sessionDurationMinutes(u.getSessionDurationMinutes())
                        .cancellationPolicy(u.getCancellationPolicy())
                        .reschedulePolicy(u.getReschedulePolicy())
                        .sessionFeeMin(u.getSessionFeeMin())
                        .sessionFeeMax(u.getSessionFeeMax())
                        .offersOnline(u.isOffersOnline())
                        .offersFaceToFace(u.isOffersFaceToFace())
                        .latitude(u.getLatitude())
                        .longitude(u.getLongitude())
                        .build();
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(experts));
    }

    @GetMapping("/stats")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getExpertStats(@CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(patientService.getExpertStats(principal.getId())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getExpert(@PathVariable UUID id) {
        var user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("Uzman bulunamadi"));
        if (user.getRole() != UserRole.EXPERT || !user.isVerified()) {
            throw new RuntimeException("Uzman bulunamadi");
        }
        var articles = articleRepository.findByAuthorIdOrderByCreatedAtDesc(id, PageRequest.of(0, 10));

        UserDto dto = UserDto.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .expertTitle(user.getExpertTitle())
                .verified(user.isVerified())
                .bio(user.getBio())
                .city(user.getCity())
                .institution(user.getInstitution())
                .specializations(user.getSpecializations())
                .acceptingPatients(user.isAcceptingPatients())
                .ageGroups(user.getAgeGroups())
                .supportTopics(user.getSupportTopics())
                .spokenLanguages(user.getSpokenLanguages())
                .sessionDurationMinutes(user.getSessionDurationMinutes())
                .cancellationPolicy(user.getCancellationPolicy())
                .reschedulePolicy(user.getReschedulePolicy())
                .sessionFeeMin(user.getSessionFeeMin())
                .sessionFeeMax(user.getSessionFeeMax())
                .offersOnline(user.isOffersOnline())
                .offersFaceToFace(user.isOffersFaceToFace())
                .latitude(user.getLatitude())
                .longitude(user.getLongitude())
                .profileImageUrl(user.getProfileImageUrl())
                .createdAt(user.getCreatedAt())
                .build();

        return ResponseEntity.ok(ApiResponse.success(Map.of("expert", dto, "articleCount", articles.getTotalElements())));
    }

    @PutMapping("/profile")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<ApiResponse<UserDto>> updateProfile(
            @RequestBody ExpertProfileUpdateRequest body,
            @CurrentUser UserPrincipal principal) {

        var user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

        if (body.getBio() != null) {
            user.setBio(body.getBio());
        }
        if (body.getExpertTitle() != null) {
            user.setExpertTitle(body.getExpertTitle());
        }
        if (body.getInstitution() != null) {
            user.setInstitution(body.getInstitution());
        }
        if (body.getCity() != null) {
            user.setCity(body.getCity());
        }
        if (body.getSpecializations() != null) {
            user.setSpecializations(body.getSpecializations());
        }
        if (body.getAcceptingPatients() != null) {
            user.setAcceptingPatients(body.getAcceptingPatients());
        }
        if (body.getAgeGroups() != null) user.setAgeGroups(body.getAgeGroups());
        if (body.getSupportTopics() != null) user.setSupportTopics(body.getSupportTopics());
        if (body.getSpokenLanguages() != null) user.setSpokenLanguages(body.getSpokenLanguages());
        if (body.getSessionDurationMinutes() != null) {
            user.setSessionDurationMinutes(Math.max(15, Math.min(180, body.getSessionDurationMinutes())));
        }
        if (body.getCancellationPolicy() != null) user.setCancellationPolicy(body.getCancellationPolicy());
        if (body.getReschedulePolicy() != null) user.setReschedulePolicy(body.getReschedulePolicy());
        if (body.getSessionFeeMin() != null) user.setSessionFeeMin(body.getSessionFeeMin().max(java.math.BigDecimal.ZERO));
        if (body.getSessionFeeMax() != null) user.setSessionFeeMax(body.getSessionFeeMax().max(java.math.BigDecimal.ZERO));
        if (body.getOffersOnline() != null) user.setOffersOnline(body.getOffersOnline());
        if (body.getOffersFaceToFace() != null) user.setOffersFaceToFace(body.getOffersFaceToFace());

        var saved = userRepository.save(user);

        UserDto dto = UserDto.builder()
                .id(saved.getId())
                .fullName(saved.getFullName())
                .role(saved.getRole().name())
                .expertTitle(saved.getExpertTitle())
                .verified(saved.isVerified())
                .bio(saved.getBio())
                .city(saved.getCity())
                .institution(saved.getInstitution())
                .specializations(saved.getSpecializations())
                .acceptingPatients(saved.isAcceptingPatients())
                .ageGroups(saved.getAgeGroups())
                .supportTopics(saved.getSupportTopics())
                .spokenLanguages(saved.getSpokenLanguages())
                .sessionDurationMinutes(saved.getSessionDurationMinutes())
                .cancellationPolicy(saved.getCancellationPolicy())
                .reschedulePolicy(saved.getReschedulePolicy())
                .sessionFeeMin(saved.getSessionFeeMin())
                .sessionFeeMax(saved.getSessionFeeMax())
                .offersOnline(saved.isOffersOnline())
                .offersFaceToFace(saved.isOffersFaceToFace())
                .profileImageUrl(saved.getProfileImageUrl())
                .createdAt(saved.getCreatedAt())
                .build();

        return ResponseEntity.ok(ApiResponse.success("Profil başarıyla güncellendi", dto));
    }
}
