package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.ExpertAnalyticsDto;
import com.autismsupport.platform.dto.KnowledgeArticleDto;
import com.autismsupport.platform.dto.UserDto;
import com.autismsupport.platform.model.Child;
import com.autismsupport.platform.model.Tag;
import com.autismsupport.platform.model.KnowledgeBookmark;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.KnowledgeBookmarkRepository;
import com.autismsupport.platform.model.KnowledgeArticle;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.model.UserRole;
import com.autismsupport.platform.repository.KnowledgeArticleRepository;
import com.autismsupport.platform.repository.UserRepository;
import com.autismsupport.platform.repository.ArticleCommentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class KnowledgeArticleService {
    private final KnowledgeArticleRepository articleRepository;
    private final UserRepository userRepository;
    private final ArticleCommentRepository commentRepository;
    private final KnowledgeBookmarkRepository bookmarkRepository;
    private final ChildRepository childRepository;

    @Transactional(readOnly = true)
    public Page<KnowledgeArticleDto> getPublishedArticles(Pageable pageable, UUID userId) {
        Set<UUID> bookmarkedIds = getBookmarkedArticleIdsForUser(userId);
        return articleRepository.findByPublishedTrueOrderByCreatedAtDesc(pageable).map(a -> {
            KnowledgeArticleDto dto = toDto(a);
            dto.setBookmarked(bookmarkedIds.contains(a.getId()));
            return dto;
        });
    }

    @Transactional(readOnly = true)
    public Page<KnowledgeArticleDto> getByCategory(String category, Pageable pageable, UUID userId) {
        Set<UUID> bookmarkedIds = getBookmarkedArticleIdsForUser(userId);
        return articleRepository.findByCategoryAndPublishedTrue(category, pageable).map(a -> {
            KnowledgeArticleDto dto = toDto(a);
            dto.setBookmarked(bookmarkedIds.contains(a.getId()));
            return dto;
        });
    }

    @Transactional(readOnly = true)
    public Page<KnowledgeArticleDto> getByFormat(String format, Pageable pageable, UUID userId) {
        Set<UUID> bookmarkedIds = getBookmarkedArticleIdsForUser(userId);
        return articleRepository.findByFormatAndPublishedTrue(format, pageable).map(a -> {
            KnowledgeArticleDto dto = toDto(a);
            dto.setBookmarked(bookmarkedIds.contains(a.getId()));
            return dto;
        });
    }

    @Transactional(readOnly = true)
    public Page<KnowledgeArticleDto> filterArticles(String q, String category, String format, List<UUID> tagIds, Pageable pageable, UUID userId) {
        String qParam = q == null ? "" : q.trim();
        String categoryParam = category == null ? "" : category;
        String formatParam = format == null ? "" : format;
        boolean hasTags = tagIds != null && !tagIds.isEmpty();
        Set<UUID> bookmarkedIds = getBookmarkedArticleIdsForUser(userId);
        return articleRepository.filterPublished(qParam, categoryParam, formatParam, hasTags, tagIds, pageable).map(a -> {
            KnowledgeArticleDto dto = toDto(a);
            dto.setBookmarked(bookmarkedIds.contains(a.getId()));
            return dto;
        });
    }

    @Transactional(readOnly = true)
    public List<KnowledgeArticleDto> getRelatedArticles(UUID id, UUID userId) {
        KnowledgeArticle article = articleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Makale bulunamadı"));
        if (article.getCategory() == null || article.getCategory().isBlank()) {
            return List.of();
        }
        Set<UUID> bookmarkedIds = getBookmarkedArticleIdsForUser(userId);
        return articleRepository.findTop4ByCategoryAndPublishedTrueAndIdNotOrderByViewCountDesc(article.getCategory(), id)
                .stream().map(a -> {
                    KnowledgeArticleDto dto = toDto(a);
                    dto.setBookmarked(bookmarkedIds.contains(a.getId()));
                    return dto;
                }).collect(Collectors.toList());
    }

    @Transactional
    public KnowledgeArticleDto getArticle(UUID id, UUID userId) {
        KnowledgeArticle article = articleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Makale bulunamadı"));
        article.setViewCount(article.getViewCount() + 1);
        articleRepository.save(article);
        KnowledgeArticleDto dto = toDto(article);
        if (userId != null) {
            dto.setBookmarked(bookmarkRepository.existsByUserIdAndArticleId(userId, id));
        }
        return dto;
    }

    @Transactional
    public KnowledgeArticleDto createArticle(KnowledgeArticleDto dto, UUID userId) {
        User author = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        if (author.getRole() == UserRole.PARENT) {
            throw new RuntimeException("Sadece uzmanlar makale yazabilir");
        }
        KnowledgeArticle article = KnowledgeArticle.builder()
                .title(dto.getTitle())
                .content(dto.getContent())
                .category(dto.getCategory())
                .format(dto.getFormat() != null ? dto.getFormat() : "TEXT")
                .mediaUrl(dto.getMediaUrl())
                .sourceName(blankToNull(dto.getSourceName()))
                .sourceUrl(blankToNull(dto.getSourceUrl()))
                .sourceAuthor(blankToNull(dto.getSourceAuthor()))
                .sourcePublication(blankToNull(dto.getSourcePublication()))
                .sourcePublishedAt(dto.getSourcePublishedAt())
                .sourceAccessedAt(dto.getSourceAccessedAt())
                .doi(blankToNull(dto.getDoi()))
                .licenseType(normalizeMetadata(dto.getLicenseType(), "UNKNOWN"))
                .usageType(normalizeMetadata(dto.getUsageType(), "ORIGINAL"))
                .evidenceLevel(normalizeMetadata(dto.getEvidenceLevel(), "EXPERT_REVIEW"))
                .originalLanguage(normalizeMetadata(dto.getOriginalLanguage(), "tr"))
                .aiGenerated(dto.isAiGenerated())
                .author(author)
                .published(false)
                .pendingReview(true)
                .build();
        if (author.getRole() == UserRole.ADMIN && dto.isPublished()) {
            validateForPublication(article);
            article.setPublished(true);
            article.setPendingReview(false);
            article.setReviewedBy(author);
            article.setReviewedAt(LocalDateTime.now());
        }
        return toDto(articleRepository.save(article));
    }

    @Transactional
    public KnowledgeArticleDto updateArticle(UUID id, KnowledgeArticleDto dto, UUID userId) {
        KnowledgeArticle article = articleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Makale bulunamadı"));
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        if ((article.getAuthor() == null || !article.getAuthor().getId().equals(userId)) && user.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("Bu makaleyi düzenleme yetkiniz yok");
        }
        article.setTitle(dto.getTitle());
        article.setContent(dto.getContent());
        article.setCategory(dto.getCategory());
        if (dto.getFormat() != null) article.setFormat(dto.getFormat());
        if (dto.getMediaUrl() != null) article.setMediaUrl(dto.getMediaUrl());
        article.setSourceName(blankToNull(dto.getSourceName()));
        article.setSourceUrl(blankToNull(dto.getSourceUrl()));
        article.setSourceAuthor(blankToNull(dto.getSourceAuthor()));
        article.setSourcePublication(blankToNull(dto.getSourcePublication()));
        article.setSourcePublishedAt(dto.getSourcePublishedAt());
        article.setSourceAccessedAt(dto.getSourceAccessedAt());
        article.setDoi(blankToNull(dto.getDoi()));
        article.setLicenseType(normalizeMetadata(dto.getLicenseType(), "UNKNOWN"));
        article.setUsageType(normalizeMetadata(dto.getUsageType(), "ORIGINAL"));
        article.setEvidenceLevel(normalizeMetadata(dto.getEvidenceLevel(), "EXPERT_REVIEW"));
        article.setOriginalLanguage(normalizeMetadata(dto.getOriginalLanguage(), "tr"));
        article.setAiGenerated(dto.isAiGenerated());
        // Her esaslı düzenleme önceki onayı geçersiz kılar.
        article.setPublished(false);
        article.setPendingReview(true);
        article.setReviewedBy(null);
        article.setReviewedAt(null);
        article.setReviewNotes(null);
        return toDto(articleRepository.save(article));
    }

    @Transactional
    public void deleteArticle(UUID id, UUID userId) {
        KnowledgeArticle article = articleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Makale bulunamadı"));
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        if ((article.getAuthor() == null || !article.getAuthor().getId().equals(userId)) && user.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("Bu makaleyi silme yetkiniz yok");
        }
        articleRepository.delete(article);
    }

    @Transactional
    public KnowledgeArticleDto togglePublish(UUID id, UUID userId) {
        KnowledgeArticle article = articleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Makale bulunamadı"));
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        if ((article.getAuthor() == null || !article.getAuthor().getId().equals(userId)) && user.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("Yetkiniz yok");
        }
        if (article.isPublished()) {
            article.setPublished(false);
            article.setPendingReview(true);
        } else {
            if (user.getRole() != UserRole.ADMIN) {
                throw new RuntimeException("Yayın için yönetici editöryal onayı gerekir");
            }
            validateForPublication(article);
            article.setPublished(true);
            article.setPendingReview(false);
            article.setReviewedBy(user);
            article.setReviewedAt(LocalDateTime.now());
        }
        return toDto(articleRepository.save(article));
    }

    @Transactional(readOnly = true)
    public Page<KnowledgeArticleDto> getMyArticles(UUID userId, Pageable pageable) {
        return articleRepository.findByAuthorIdOrderByCreatedAtDesc(userId, pageable).map(this::toDto);
    }

    public ExpertAnalyticsDto getMyAnalytics(UUID userId) {
        long totalArticles = articleRepository.countByAuthorId(userId);
        long publishedArticles = articleRepository.countByAuthorIdAndPublishedTrue(userId);
        Long totalViews = articleRepository.sumViewCountByAuthorId(userId);
        long totalComments = commentRepository.countByArticleAuthorId(userId);
        
        return ExpertAnalyticsDto.builder()
                .totalArticles(totalArticles)
                .publishedArticles(publishedArticles)
                .totalViews(totalViews != null ? totalViews : 0L)
                .totalComments(totalComments)
                .build();
    }

    public KnowledgeArticleDto toDto(KnowledgeArticle a) {
        UserDto authorDto = a.getAuthor() == null ? null : UserDto.builder()
                .id(a.getAuthor().getId())
                .fullName(a.getAuthor().getFullName())
                .role(a.getAuthor().getRole().name())
                .expertTitle(a.getAuthor().getExpertTitle())
                .verified(a.getAuthor().isVerified())
                .profileImageUrl(a.getAuthor().getProfileImageUrl())
                .build();
        java.util.Set<com.autismsupport.platform.dto.TagDto> tagDtos = a.getTags() == null ? java.util.Collections.emptySet() :
            a.getTags().stream().map(t -> com.autismsupport.platform.dto.TagDto.builder()
                .id(t.getId())
                .name(t.getName())
                .category(t.getCategory())
                .description(t.getDescription())
                .build()).collect(java.util.stream.Collectors.toSet());

        return KnowledgeArticleDto.builder()
                .id(a.getId())
                .title(a.getTitle())
                .content(a.getContent())
                .category(a.getCategory())
                .format(a.getFormat())
                .mediaUrl(a.getMediaUrl())
                .sourceName(a.getSourceName())
                .sourceUrl(a.getSourceUrl())
                .pendingReview(a.isPendingReview())
                .sourceAuthor(a.getSourceAuthor())
                .sourcePublication(a.getSourcePublication())
                .sourcePublishedAt(a.getSourcePublishedAt())
                .sourceAccessedAt(a.getSourceAccessedAt())
                .doi(a.getDoi())
                .licenseType(a.getLicenseType())
                .usageType(a.getUsageType())
                .evidenceLevel(a.getEvidenceLevel())
                .originalLanguage(a.getOriginalLanguage())
                .aiGenerated(a.isAiGenerated())
                .reviewedBy(toReviewerDto(a.getReviewedBy()))
                .reviewedAt(a.getReviewedAt())
                .reviewNotes(a.getReviewNotes())
                .tags(tagDtos)
                .author(authorDto)
                .published(a.isPublished())
                .viewCount(a.getViewCount())
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }

    private String blankToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /* ── Dış kaynaklı taslakların admin onay akışı ──────────────────────────── */

    @Transactional(readOnly = true)
    public List<KnowledgeArticleDto> getPendingReviewArticles() {
        return articleRepository.findByPendingReviewTrueOrderByCreatedAtDesc().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public KnowledgeArticleDto approveExternalDraft(UUID id, UUID reviewerId, String reviewNotes) {
        KnowledgeArticle article = articleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Makale bulunamadı"));
        User reviewer = userRepository.findById(reviewerId)
                .orElseThrow(() -> new RuntimeException("İnceleyen kullanıcı bulunamadı"));
        validateForPublication(article);
        article.setPublished(true);
        article.setPendingReview(false);
        article.setReviewedBy(reviewer);
        article.setReviewedAt(LocalDateTime.now());
        article.setReviewNotes(blankToNull(reviewNotes));
        return toDto(articleRepository.save(article));
    }

    @Transactional
    public KnowledgeArticleDto rejectExternalDraft(UUID id) {
        KnowledgeArticle article = articleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Makale bulunamadı"));
        article.setPendingReview(false);
        return toDto(articleRepository.save(article));
    }

    private UserDto toReviewerDto(User reviewer) {
        if (reviewer == null) return null;
        return UserDto.builder()
                .id(reviewer.getId())
                .fullName(reviewer.getFullName())
                .role(reviewer.getRole().name())
                .expertTitle(reviewer.getExpertTitle())
                .verified(reviewer.isVerified())
                .build();
    }

    private String normalizeMetadata(String value, String fallback) {
        String normalized = blankToNull(value);
        return normalized == null ? fallback : normalized.trim().toUpperCase();
    }

    private void validateForPublication(KnowledgeArticle article) {
        String usageType = normalizeMetadata(article.getUsageType(), "ORIGINAL");
        String licenseType = normalizeMetadata(article.getLicenseType(), "UNKNOWN");
        if (!"ORIGINAL".equals(usageType)) {
            if (blankToNull(article.getSourceName()) == null || blankToNull(article.getSourceUrl()) == null) {
                throw new RuntimeException("Özet, çeviri ve uyarlamalarda kaynak adı ile bağlantısı zorunludur");
            }
            if ("UNKNOWN".equals(licenseType)) {
                throw new RuntimeException("Kaynak lisansı doğrulanmadan içerik yayımlanamaz");
            }
            if ("TRANSLATION".equals(usageType) && ("CC_BY_ND".equals(licenseType) || "RIGHTS_RESERVED".equals(licenseType))) {
                throw new RuntimeException("Bu lisans çeviri/uyarlama yayınına izin vermiyor");
            }
        }
        if (article.getSourceUrl() != null && article.getSourceAccessedAt() == null) {
            article.setSourceAccessedAt(LocalDate.now());
        }
    }

    @Transactional(readOnly = true)
    public List<KnowledgeArticleDto> getRecommendedArticles(UUID userId) {
        List<Child> children = childRepository.findByParentIdWithTags(userId);
        if (children.isEmpty()) {
            return List.of();
        }

        Set<String> tagCategories = children.stream()
                .flatMap(c -> c.getTags().stream())
                .map(Tag::getCategory)
                .collect(Collectors.toSet());

        if (tagCategories.isEmpty()) {
            return List.of();
        }

        List<String> articleCategories = tagCategories.stream()
                .map(this::mapTagCategoryToArticleCategory)
                .filter(c -> c != null)
                .collect(Collectors.toList());

        if (articleCategories.isEmpty()) {
            return List.of();
        }

        Set<UUID> bookmarkedIds = getBookmarkedArticleIdsForUser(userId);
        return articleRepository.findTop6ByCategoryInAndPublishedTrueOrderByCreatedAtDesc(articleCategories)
                .stream().map(a -> {
                    KnowledgeArticleDto dto = toDto(a);
                    dto.setBookmarked(bookmarkedIds.contains(a.getId()));
                    return dto;
                }).collect(Collectors.toList());
    }

    private String mapTagCategoryToArticleCategory(String tagCategory) {
        if (tagCategory == null) return null;
        switch (tagCategory.toUpperCase()) {
            case "ILETISIM": return "İletişim";
            case "SOSYAL": return "Sosyal Beceriler";
            case "DUYUSAL": return "Duyusal Gelişim";
            case "DAVRANIS": return "Davranış";
            case "EGITIM": return "Eğitim";
            case "MOTOR": return "Genel";
            default: return null;
        }
    }

    @Transactional
    public boolean toggleBookmark(UUID articleId, UUID userId) {
        Optional<KnowledgeBookmark> existing = bookmarkRepository.findByUserIdAndArticleId(userId, articleId);
        if (existing.isPresent()) {
            bookmarkRepository.delete(existing.get());
            return false;
        } else {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
            KnowledgeArticle article = articleRepository.findById(articleId)
                    .orElseThrow(() -> new RuntimeException("Makale bulunamadı"));

            KnowledgeBookmark bookmark = KnowledgeBookmark.builder()
                    .user(user)
                    .article(article)
                    .build();
            bookmarkRepository.save(bookmark);
            return true;
        }
    }

    @Transactional(readOnly = true)
    public List<KnowledgeArticleDto> getBookmarkedArticles(UUID userId) {
        List<KnowledgeArticle> articles = bookmarkRepository.findArticlesByUserId(userId);
        return articles.stream().map(a -> {
            KnowledgeArticleDto dto = toDto(a);
            dto.setBookmarked(true);
            return dto;
        }).collect(Collectors.toList());
    }

    private Set<UUID> getBookmarkedArticleIdsForUser(UUID userId) {
        if (userId == null) return Set.of();
        return bookmarkRepository.findArticleIdsByUserId(userId);
    }
}
