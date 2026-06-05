package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.ForumComment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface ForumCommentRepository extends JpaRepository<ForumComment, UUID> {
    @EntityGraph(attributePaths = {"author", "parentComment"})
    Page<ForumComment> findByPostIdAndParentCommentIsNullOrderByCreatedAtAsc(UUID postId, Pageable pageable);

    @EntityGraph(attributePaths = {"author", "parentComment"})
    Page<ForumComment> findByPostIdOrderByCreatedAtAsc(UUID postId, Pageable pageable);

    @EntityGraph(attributePaths = {"author", "parentComment"})
    Page<ForumComment> findByParentCommentIdOrderByCreatedAtAsc(UUID parentCommentId, Pageable pageable);

    long countByPostId(UUID postId);

    @Modifying
    @Query("UPDATE ForumComment c SET c.voteCount = :voteCount, c.likeCount = :likeCount WHERE c.id = :id")
    void updateVoteAndLikeCounts(@Param("id") UUID id, @Param("voteCount") int voteCount, @Param("likeCount") int likeCount);
}
