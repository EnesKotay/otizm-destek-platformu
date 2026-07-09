package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<AuditLog> findTop3ByUserIdOrderByCreatedAtDesc(UUID userId);

    long countByUserId(UUID userId);

    @Query("""
            SELECT a FROM AuditLog a
            WHERE (:userId IS NULL OR a.user.id = :userId)
              AND (:action IS NULL OR LOWER(a.action) LIKE LOWER(CONCAT('%', :action, '%')))
              AND (:from IS NULL OR a.createdAt >= :from)
              AND (:to IS NULL OR a.createdAt <= :to)
            ORDER BY a.createdAt DESC
            """)
    Page<AuditLog> findWithFilters(
            @Param("userId") UUID userId,
            @Param("action") String action,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            Pageable pageable
    );
}
