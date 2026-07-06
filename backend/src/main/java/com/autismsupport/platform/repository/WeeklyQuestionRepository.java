package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.WeeklyQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WeeklyQuestionRepository extends JpaRepository<WeeklyQuestion, UUID> {
    List<WeeklyQuestion> findByActiveTrueOrderBySortOrderAsc();
    List<WeeklyQuestion> findByActiveTrueOrderByCreatedAtDesc();
}
