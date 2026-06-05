package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.VenueReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface VenueReviewRepository extends JpaRepository<VenueReview, UUID> {
    List<VenueReview> findByVenueId(UUID venueId);
}
