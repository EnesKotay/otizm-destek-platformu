package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.ExpertProfileUpdateRequest;
import com.autismsupport.platform.dto.UserDto;
import com.autismsupport.platform.model.UserRole;
import com.autismsupport.platform.repository.KnowledgeArticleRepository;
import com.autismsupport.platform.repository.UserRepository;
import com.autismsupport.platform.repository.ExpertReviewRepository;
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
        List<UserDto> experts = userRepository.findByRole(UserRole.EXPERT).stream()
                .filter(u -> city == null || city.isBlank() ||
                        (u.getCity() != null && u.getCity().equalsIgnoreCase(city)))
                .filter(u -> specialization == null || specialization.isBlank() ||
                        (u.getSpecializations() != null && u.getSpecializations().stream()
                                .anyMatch(s -> s.toLowerCase().contains(specialization.toLowerCase()))))
                .map(u -> {
                    Double avgRating = reviewRepository.findAverageRatingByExpertId(u.getId());
                    long articleCount = articleRepository.countByAuthorId(u.getId());
                    long reviewCount = reviewRepository.countByExpertId(u.getId());

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
                        .avgRating(avgRating != null ? avgRating : 0.0)
                        .articleCount(articleCount)
                        .reviewCount(reviewCount)
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
        var articles = articleRepository.findByAuthorIdOrderByCreatedAtDesc(id, PageRequest.of(0, 10));

        UserDto dto = UserDto.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .expertTitle(user.getExpertTitle())
                .verified(user.isVerified())
                .profileImageUrl(user.getProfileImageUrl())
                .createdAt(user.getCreatedAt())
                .build();

        return ResponseEntity.ok(ApiResponse.success(Map.of("expert", dto, "articleCount", articles.getTotalElements())));
    }

    @PutMapping("/profile")
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

        var saved = userRepository.save(user);

        UserDto dto = UserDto.builder()
                .id(saved.getId())
                .fullName(saved.getFullName())
                .role(saved.getRole().name())
                .expertTitle(saved.getExpertTitle())
                .verified(saved.isVerified())
                .profileImageUrl(saved.getProfileImageUrl())
                .createdAt(saved.getCreatedAt())
                .build();

        return ResponseEntity.ok(ApiResponse.success("Profil başarıyla güncellendi", dto));
    }
}
