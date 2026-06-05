package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.ArticleComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface ArticleCommentRepository extends JpaRepository<ArticleComment, UUID> {
    Page<ArticleComment> findByArticleIdOrderByCreatedAtDesc(UUID articleId, Pageable pageable);
    long countByArticleAuthorId(UUID authorId);
}
