package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.ForumAnswerFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ForumAnswerFeedbackRepository extends JpaRepository<ForumAnswerFeedback, UUID> {
    Optional<ForumAnswerFeedback> findByCommentIdAndUserId(UUID commentId, UUID userId);
    long countByCommentIdAndOutcome(UUID commentId, String outcome);
}

