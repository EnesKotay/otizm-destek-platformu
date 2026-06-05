package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.ExpertReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExpertReviewRepository extends JpaRepository<ExpertReview, UUID> {
    List<ExpertReview> findByExpertIdOrderByCreatedAtDesc(UUID expertId);
    Optional<ExpertReview> findByExpertIdAndReviewerId(UUID expertId, UUID reviewerId);

    @Query("SELECT AVG(r.rating) FROM ExpertReview r WHERE r.expert.id = :expertId")
    Double findAverageRatingByExpertId(UUID expertId);

    long countByExpertId(UUID expertId);
}
