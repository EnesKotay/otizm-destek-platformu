package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.BepReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BepReportRepository extends JpaRepository<BepReport, UUID> {
    List<BepReport> findByChildIdOrderBySharedAtDesc(UUID childId);
}
