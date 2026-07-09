package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.KnowledgeArticle;
import com.autismsupport.platform.model.KnowledgeBookmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface KnowledgeBookmarkRepository extends JpaRepository<KnowledgeBookmark, UUID> {
    Optional<KnowledgeBookmark> findByUserIdAndArticleId(UUID userId, UUID articleId);
    boolean existsByUserIdAndArticleId(UUID userId, UUID articleId);

    @Query("SELECT b.article.id FROM KnowledgeBookmark b WHERE b.user.id = :userId")
    Set<UUID> findArticleIdsByUserId(@Param("userId") UUID userId);

    @Query("SELECT b.article FROM KnowledgeBookmark b WHERE b.user.id = :userId ORDER BY b.createdAt DESC")
    List<KnowledgeArticle> findArticlesByUserId(@Param("userId") UUID userId);
}
