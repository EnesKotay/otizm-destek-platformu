package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.ForumPost;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Set;
import java.util.Optional;
import java.util.UUID;

public interface ForumPostRepository extends JpaRepository<ForumPost, UUID> {

    @EntityGraph(attributePaths = {"author", "tags"})
    @Query("SELECT DISTINCT p FROM ForumPost p WHERE p.category = :category ORDER BY p.pinned DESC, p.createdAt DESC")
    Page<ForumPost> findByCategory(@Param("category") String category, Pageable pageable);

    @EntityGraph(attributePaths = {"author", "tags"})
    @Query("SELECT DISTINCT p FROM ForumPost p ORDER BY p.pinned DESC, p.createdAt DESC")
    Page<ForumPost> findAllByOrderByPinnedDescCreatedAtDesc(Pageable pageable);

    Page<ForumPost> findByAuthorId(UUID authorId, Pageable pageable);

    @EntityGraph(attributePaths = {"author", "tags"})
    @Query("SELECT DISTINCT p FROM ForumPost p WHERE p.postType = :postType ORDER BY p.pinned DESC, p.createdAt DESC")
    Page<ForumPost> findByPostTypeOrderByPinnedDescCreatedAtDesc(@Param("postType") String postType, Pageable pageable);

    @EntityGraph(attributePaths = {"author", "tags"})
    @Query("SELECT p FROM ForumPost p WHERE p.postType = :postType AND p.category = :category ORDER BY p.pinned DESC, p.createdAt DESC")
    Page<ForumPost> findByPostTypeAndCategory(@Param("postType") String postType, @Param("category") String category, Pageable pageable);

    @EntityGraph(attributePaths = {"author", "tags"})
    @Query("SELECT DISTINCT p FROM ForumPost p JOIN p.tags t WHERE t.id IN :tagIds ORDER BY p.pinned DESC, p.createdAt DESC")
    Page<ForumPost> findByTagIds(@Param("tagIds") Set<UUID> tagIds, Pageable pageable);

    @EntityGraph(attributePaths = {"author", "tags"})
    @Query("SELECT DISTINCT p FROM ForumPost p JOIN p.tags t WHERE p.postType = :postType AND t.id IN :tagIds ORDER BY p.pinned DESC, p.createdAt DESC")
    Page<ForumPost> findByPostTypeAndTagIds(@Param("postType") String postType, @Param("tagIds") Set<UUID> tagIds, Pageable pageable);

    @EntityGraph(attributePaths = {"author", "tags"})
    @Query("SELECT p FROM ForumPost p WHERE p.featured = true ORDER BY p.createdAt DESC")
    Page<ForumPost> findByFeaturedTrueOrderByCreatedAtDesc(Pageable pageable);

    @EntityGraph(attributePaths = {"author", "tags"})
    @Query("SELECT p FROM ForumPost p WHERE p.postType = 'QUESTION' AND p.answered = false ORDER BY p.createdAt DESC")
    Page<ForumPost> findUnansweredQuestions(Pageable pageable);

    @EntityGraph(attributePaths = {"author", "tags"})
    @Query("SELECT p FROM ForumPost p WHERE LOWER(p.title) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(p.content) LIKE LOWER(CONCAT('%', :q, '%')) ORDER BY p.createdAt DESC")
    Page<ForumPost> searchByQuery(@Param("q") String q, Pageable pageable);

    @EntityGraph(attributePaths = {"author", "tags"})
    @Query("SELECT p FROM ForumPost p WHERE p.id = :id")
    Optional<ForumPost> findByIdWithAuthorAndTags(@Param("id") UUID id);

    @Modifying
    @Query("UPDATE ForumPost p SET p.likeCount = :likeCount WHERE p.id = :id")
    void updateLikeCount(@Param("id") UUID id, @Param("likeCount") int likeCount);

    @Modifying
    @Query("UPDATE ForumPost p SET p.commentCount = p.commentCount + 1 WHERE p.id = :id")
    void incrementCommentCount(@Param("id") UUID id);
}
