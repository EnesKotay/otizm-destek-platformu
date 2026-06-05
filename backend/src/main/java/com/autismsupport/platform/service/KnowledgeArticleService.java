package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.ExpertAnalyticsDto;
import com.autismsupport.platform.dto.KnowledgeArticleDto;
import com.autismsupport.platform.dto.UserDto;
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
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class KnowledgeArticleService {
    private final KnowledgeArticleRepository articleRepository;
    private final UserRepository userRepository;
    private final ArticleCommentRepository commentRepository;

    public Page<KnowledgeArticleDto> getPublishedArticles(Pageable pageable) {
        return articleRepository.findByPublishedTrueOrderByCreatedAtDesc(pageable).map(this::toDto);
    }

    public Page<KnowledgeArticleDto> getByCategory(String category, Pageable pageable) {
        return articleRepository.findByCategoryAndPublishedTrue(category, pageable).map(this::toDto);
    }

    public Page<KnowledgeArticleDto> getByFormat(String format, Pageable pageable) {
        return articleRepository.findByFormatAndPublishedTrue(format, pageable).map(this::toDto);
    }

    @Transactional
    public KnowledgeArticleDto getArticle(UUID id) {
        KnowledgeArticle article = articleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Makale bulunamadı"));
        article.setViewCount(article.getViewCount() + 1);
        articleRepository.save(article);
        return toDto(article);
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
                .author(author)
                .published(dto.isPublished())
                .build();
        return toDto(articleRepository.save(article));
    }

    @Transactional
    public KnowledgeArticleDto updateArticle(UUID id, KnowledgeArticleDto dto, UUID userId) {
        KnowledgeArticle article = articleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Makale bulunamadı"));
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        if (!article.getAuthor().getId().equals(userId) && user.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("Bu makaleyi düzenleme yetkiniz yok");
        }
        article.setTitle(dto.getTitle());
        article.setContent(dto.getContent());
        article.setCategory(dto.getCategory());
        if (dto.getFormat() != null) article.setFormat(dto.getFormat());
        if (dto.getMediaUrl() != null) article.setMediaUrl(dto.getMediaUrl());
        article.setPublished(dto.isPublished());
        return toDto(articleRepository.save(article));
    }

    @Transactional
    public void deleteArticle(UUID id, UUID userId) {
        KnowledgeArticle article = articleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Makale bulunamadı"));
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        if (!article.getAuthor().getId().equals(userId) && user.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("Bu makaleyi silme yetkiniz yok");
        }
        articleRepository.delete(article);
    }

    @Transactional
    public KnowledgeArticleDto togglePublish(UUID id, UUID userId) {
        KnowledgeArticle article = articleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Makale bulunamadı"));
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        if (!article.getAuthor().getId().equals(userId) && user.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("Yetkiniz yok");
        }
        article.setPublished(!article.isPublished());
        return toDto(articleRepository.save(article));
    }

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

    private KnowledgeArticleDto toDto(KnowledgeArticle a) {
        UserDto authorDto = a.getAuthor() == null ? null : UserDto.builder()
                .id(a.getAuthor().getId())
                .fullName(a.getAuthor().getFullName())
                .role(a.getAuthor().getRole().name())
                .expertTitle(a.getAuthor().getExpertTitle())
                .verified(a.getAuthor().isVerified())
                .profileImageUrl(a.getAuthor().getProfileImageUrl())
                .build();
        return KnowledgeArticleDto.builder()
                .id(a.getId())
                .title(a.getTitle())
                .content(a.getContent())
                .category(a.getCategory())
                .format(a.getFormat())
                .mediaUrl(a.getMediaUrl())
                .author(authorDto)
                .published(a.isPublished())
                .viewCount(a.getViewCount())
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }
}
