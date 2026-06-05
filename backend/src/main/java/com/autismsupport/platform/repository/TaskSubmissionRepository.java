package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.TaskSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TaskSubmissionRepository extends JpaRepository<TaskSubmission, UUID> {
    List<TaskSubmission> findByTaskId(UUID taskId);
    List<TaskSubmission> findByParentId(UUID parentId);
}
