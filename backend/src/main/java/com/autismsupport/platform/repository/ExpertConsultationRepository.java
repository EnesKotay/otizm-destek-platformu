package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.ExpertConsultation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface ExpertConsultationRepository extends JpaRepository<ExpertConsultation, UUID> {
    Page<ExpertConsultation> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<ExpertConsultation> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    @Query("""
            SELECT c FROM ExpertConsultation c
            WHERE (:status IS NULL OR c.status = :status)
              AND (LOWER(c.title) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(c.description) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY c.createdAt DESC
            """)
    Page<ExpertConsultation> searchByQuery(@Param("status") String status, @Param("q") String q, Pageable pageable);
}
