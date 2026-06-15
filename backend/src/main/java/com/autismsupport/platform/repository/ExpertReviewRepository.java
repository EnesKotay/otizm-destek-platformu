package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.ExpertReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExpertReviewRepository extends JpaRepository<ExpertReview, UUID> {
    List<ExpertReview> findByExpertIdOrderByCreatedAtDesc(UUID expertId);
    Optional<ExpertReview> findByExpertIdAndReviewerId(UUID expertId, UUID reviewerId);

    @Query("SELECT AVG(r.rating) FROM ExpertReview r WHERE r.expert.id = :expertId")
    Double findAverageRatingByExpertId(UUID expertId);

    long countByExpertId(UUID expertId);

    @Query("""
            SELECT r.expert.id AS expertId, AVG(r.rating) AS avgRating, COUNT(r) AS reviewCount
            FROM ExpertReview r
            WHERE r.expert.id IN :expertIds
            GROUP BY r.expert.id
            """)
    List<ExpertRatingStatsProjection> findRatingStatsByExpertIds(@Param("expertIds") List<UUID> expertIds);

    interface ExpertRatingStatsProjection {
        UUID getExpertId();
        Double getAvgRating();
        Long getReviewCount();
    }
}
