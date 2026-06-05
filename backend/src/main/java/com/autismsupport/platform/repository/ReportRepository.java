package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.Report;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface ReportRepository extends JpaRepository<Report, UUID> {
    Page<Report> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
    Page<Report> findAllByOrderByCreatedAtDesc(Pageable pageable);
    boolean existsByReporterIdAndTargetTypeAndTargetId(UUID reporterId, String targetType, UUID targetId);
    long countByStatus(String status);
}
