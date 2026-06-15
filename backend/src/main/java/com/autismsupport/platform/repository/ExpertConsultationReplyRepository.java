package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.ExpertConsultationReply;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ExpertConsultationReplyRepository extends JpaRepository<ExpertConsultationReply, UUID> {
    List<ExpertConsultationReply> findByConsultationIdOrderByCreatedAtAsc(UUID consultationId);
    long countByConsultationId(UUID consultationId);
}
