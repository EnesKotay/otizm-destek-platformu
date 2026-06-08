package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.ConnectionStatus;
import com.autismsupport.platform.model.ExpertPatientConnection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExpertPatientConnectionRepository extends JpaRepository<ExpertPatientConnection, UUID> {

    List<ExpertPatientConnection> findByExpertIdAndStatus(UUID expertId, ConnectionStatus status);

    @Query("SELECT c FROM ExpertPatientConnection c JOIN FETCH c.child ch JOIN FETCH ch.parent WHERE c.expert.id = :expertId AND c.status = :status")
    Page<ExpertPatientConnection> findApprovedWithChildByExpertId(@Param("expertId") UUID expertId,
                                                                   @Param("status") ConnectionStatus status,
                                                                   Pageable pageable);

    List<ExpertPatientConnection> findByChildIdAndStatus(UUID childId, ConnectionStatus status);

    @Query("SELECT c FROM ExpertPatientConnection c WHERE c.child.parent.id = :parentId AND c.status = :status")
    List<ExpertPatientConnection> findByChildParentIdAndStatus(@Param("parentId") UUID parentId, @Param("status") ConnectionStatus status);

    Optional<ExpertPatientConnection> findByExpertIdAndChildId(UUID expertId, UUID childId);

    boolean existsByExpertIdAndChildIdAndStatus(UUID expertId, UUID childId, ConnectionStatus status);
}
