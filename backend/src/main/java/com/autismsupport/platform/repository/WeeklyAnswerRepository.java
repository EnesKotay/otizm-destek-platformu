package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.WeeklyAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WeeklyAnswerRepository extends JpaRepository<WeeklyAnswer, UUID> {
    List<WeeklyAnswer> findByQuestionIdOrderByCreatedAtDesc(UUID questionId);

    boolean existsByQuestionIdAndAuthorId(UUID questionId, UUID authorId);
}
