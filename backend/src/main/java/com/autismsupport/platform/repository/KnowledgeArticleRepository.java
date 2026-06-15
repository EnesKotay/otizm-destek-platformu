package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.KnowledgeArticle;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface KnowledgeArticleRepository extends JpaRepository<KnowledgeArticle, UUID> {
    Page<KnowledgeArticle> findByPublishedTrueOrderByCreatedAtDesc(Pageable pageable);
    Page<KnowledgeArticle> findByCategoryAndPublishedTrue(String category, Pageable pageable);
    Page<KnowledgeArticle> findByFormatAndPublishedTrue(String format, Pageable pageable);
    Page<KnowledgeArticle> findByAuthorIdOrderByCreatedAtDesc(UUID authorId, Pageable pageable);
    long countByAuthorId(UUID authorId);
    long countByAuthorIdAndPublishedTrue(UUID authorId);

    @Query("SELECT SUM(a.viewCount) FROM KnowledgeArticle a WHERE a.author.id = :authorId")
    Long sumViewCountByAuthorId(@Param("authorId") UUID authorId);

    @Query("SELECT a FROM KnowledgeArticle a WHERE a.published = true AND (LOWER(a.title) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(a.content) LIKE LOWER(CONCAT('%', :q, '%')))")
    Page<KnowledgeArticle> searchPublished(@Param("q") String q, Pageable pageable);

    @Query("SELECT a.author.id AS authorId, COUNT(a) AS articleCount FROM KnowledgeArticle a WHERE a.author.id IN :authorIds GROUP BY a.author.id")
    List<ArticleCountProjection> findArticleCountsByAuthorIds(@Param("authorIds") List<UUID> authorIds);

    interface ArticleCountProjection {
        UUID getAuthorId();
        Long getArticleCount();
    }
}
