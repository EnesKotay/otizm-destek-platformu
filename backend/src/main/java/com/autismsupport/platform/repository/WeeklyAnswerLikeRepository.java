package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.WeeklyAnswerLike;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface WeeklyAnswerLikeRepository extends JpaRepository<WeeklyAnswerLike, UUID> {
    Optional<WeeklyAnswerLike> findByAnswerIdAndUserId(UUID answerId, UUID userId);

    boolean existsByAnswerIdAndUserId(UUID answerId, UUID userId);

    long countByAnswerId(UUID answerId);
}
