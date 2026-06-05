package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.ClinicalDataShare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClinicalDataShareRepository extends JpaRepository<ClinicalDataShare, UUID> {

    @Query("SELECT s FROM ClinicalDataShare s WHERE s.child.id = :childId AND s.expert.id = :expertId AND s.status = 'ACTIVE'")
    Optional<ClinicalDataShare> findActiveShare(@Param("childId") UUID childId, @Param("expertId") UUID expertId);

    List<ClinicalDataShare> findByParentIdAndStatus(UUID parentId, String status);

    @Query("SELECT s FROM ClinicalDataShare s JOIN FETCH s.child c JOIN FETCH s.parent p WHERE s.expert.id = :expertId AND s.status = 'ACTIVE'")
    List<ClinicalDataShare> findActiveSharesForExpert(@Param("expertId") UUID expertId);
}
