package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.ExpertTask;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ExpertTaskRepository extends JpaRepository<ExpertTask, UUID> {
    List<ExpertTask> findByExpertIdAndChildIdOrderByCreatedAtDesc(UUID expertId, UUID childId);
    List<ExpertTask> findByExpertIdAndParentIdOrderByCreatedAtDesc(UUID expertId, UUID parentId);
    List<ExpertTask> findByParentIdOrderByCreatedAtDesc(UUID parentId);
    long countByExpertId(UUID expertId);
    long countByExpertIdAndChildId(UUID expertId, UUID childId);
    long countByExpertIdAndChildIdAndStatus(UUID expertId, UUID childId, String status);
    long countByExpertIdAndStatus(UUID expertId, String status);
    List<ExpertTask> findByExpertIdOrderByCreatedAtDesc(UUID expertId);
    List<ExpertTask> findByDueDateBeforeAndStatusNot(LocalDate dueDate, String status);
}
