package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.DataSubjectRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface DataSubjectRequestRepository extends JpaRepository<DataSubjectRequest, UUID> {

    List<DataSubjectRequest> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<DataSubjectRequest> findByStatusInOrderByDueAtAsc(List<DataSubjectRequest.Status> statuses);

    List<DataSubjectRequest> findByStatusInAndDueAtBefore(
            List<DataSubjectRequest.Status> statuses, LocalDateTime cutoff);

    long countByStatusIn(List<DataSubjectRequest.Status> statuses);

    List<DataSubjectRequest> findByResolvedAtBefore(LocalDateTime cutoff);
}
