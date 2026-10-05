package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.WeeklyQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;
import java.util.UUID;

public interface WeeklyQuestionRepository extends JpaRepository<WeeklyQuestion, UUID> {
    List<WeeklyQuestion> findByActiveTrueOrderBySortOrderAsc();
    List<WeeklyQuestion> findByActiveTrueOrderByPublishedAtDescSortOrderAsc();
    boolean existsByCreatedAtGreaterThanEqual(LocalDateTime createdAt);
    boolean existsByPublishedAtGreaterThanEqual(LocalDateTime publishedAt);
    Optional<WeeklyQuestion> findFirstByActiveFalseOrderByCreatedAtDesc();
}
