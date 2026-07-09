package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.ArticleCommentDto;
import com.autismsupport.platform.dto.UserDto;
import com.autismsupport.platform.model.ArticleComment;
import com.autismsupport.platform.model.KnowledgeArticle;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.ArticleCommentRepository;
import com.autismsupport.platform.repository.KnowledgeArticleRepository;
import com.autismsupport.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ArticleCommentService {
    private final ArticleCommentRepository commentRepository;
    private final KnowledgeArticleRepository articleRepository;
    private final UserRepository userRepository;

    public Page<ArticleCommentDto> getComments(UUID articleId, Pageable pageable) {
        return commentRepository.findByArticleIdOrderByCreatedAtDesc(articleId, pageable).map(this::toDto);
    }

    @Transactional
    public ArticleCommentDto addComment(UUID articleId, ArticleCommentDto dto, UUID userId) {
        KnowledgeArticle article = articleRepository.findById(articleId).orElseThrow(() -> new RuntimeException("Makale bulunamadı"));
        User author = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

        ArticleComment comment = ArticleComment.builder()
                .article(article)
                .author(author)
                .content(dto.getContent())
                .isExperience(dto.isExperience())
                .durationTried(dto.getDurationTried())
                .effectivenessRating(dto.getEffectivenessRating())
                .build();

        return toDto(commentRepository.save(comment));
    }

    private ArticleCommentDto toDto(ArticleComment c) {
        UserDto authorDto = c.getAuthor() == null ? null : UserDto.builder()
                .id(c.getAuthor().getId())
                .fullName(c.getAuthor().getFullName())
                .role(c.getAuthor().getRole().name())
                .profileImageUrl(c.getAuthor().getProfileImageUrl())
                .expertTitle(c.getAuthor().getExpertTitle())
                .build();

        return ArticleCommentDto.builder()
                .id(c.getId())
                .content(c.getContent())
                .articleId(c.getArticle().getId())
                .author(authorDto)
                .isExperience(c.isExperience())
                .durationTried(c.getDurationTried())
                .effectivenessRating(c.getEffectivenessRating())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
