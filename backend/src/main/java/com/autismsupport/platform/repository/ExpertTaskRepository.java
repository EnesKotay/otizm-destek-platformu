package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.ExpertTask;
import com.autismsupport.platform.model.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ExpertTaskRepository extends JpaRepository<ExpertTask, UUID> {

    List<ExpertTask> findByExpertIdAndChildIdOrderByCreatedAtDesc(UUID expertId, UUID childId);
    boolean existsByExpertIdAndChildId(UUID expertId, UUID childId);
    List<ExpertTask> findByExpertIdAndParentIdOrderByCreatedAtDesc(UUID expertId, UUID parentId);
    List<ExpertTask> findByParentIdOrderByCreatedAtDesc(UUID parentId);
    List<ExpertTask> findByChildParentIdOrderByCreatedAtDesc(UUID parentId);

    long countByExpertId(UUID expertId);

    long countByExpertIdAndChildId(UUID expertId, UUID childId);

    long countByExpertIdAndChildIdAndStatus(UUID expertId, UUID childId, TaskStatus status);

    long countByExpertIdAndStatus(UUID expertId, TaskStatus status);

    List<ExpertTask> findByExpertIdOrderByCreatedAtDesc(UUID expertId);

    List<ExpertTask> findByDueDateBeforeAndStatusNot(LocalDate dueDate, TaskStatus status);

    @Modifying
    @Query("UPDATE ExpertTask t SET t.status = :newStatus WHERE t.expert.id = :expertId AND t.child.id = :childId AND t.status = :currentStatus")
    int bulkUpdateStatus(@Param("expertId") UUID expertId,
                         @Param("childId") UUID childId,
                         @Param("currentStatus") TaskStatus currentStatus,
                         @Param("newStatus") TaskStatus newStatus);

    @Query(value = """
            SELECT t.child_id AS childId,
                   COUNT(*)   AS total,
                   SUM(CASE WHEN t.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed
            FROM expert_tasks t
            WHERE t.expert_id = :expertId AND t.child_id IN :childIds
            GROUP BY t.child_id
            """, nativeQuery = true)
    List<TaskCountProjection> countTasksGroupedByChildren(@Param("expertId") UUID expertId,
                                                          @Param("childIds") List<UUID> childIds);
}
