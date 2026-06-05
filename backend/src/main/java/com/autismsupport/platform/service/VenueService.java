package com.autismsupport.platform.service;

import com.autismsupport.platform.model.Venue;
import com.autismsupport.platform.model.VenueReview;
import com.autismsupport.platform.repository.VenueRepository;
import com.autismsupport.platform.repository.VenueReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VenueService {

    private final VenueRepository venueRepository;
    private final VenueReviewRepository reviewRepository;

    public List<Venue> getAllVenues() {
        return venueRepository.findAll();
    }

    public Venue getVenue(UUID id) {
        return venueRepository.findById(id).orElseThrow(() -> new RuntimeException("Venue not found"));
    }

    @Transactional
    public Venue addVenue(Venue venue) {
        return venueRepository.save(venue);
    }

    @Transactional
    public VenueReview addReview(UUID venueId, UUID userId, VenueReview review) {
        review.setVenueId(venueId);
        review.setUserId(userId);
        VenueReview saved = reviewRepository.save(review);
        
        // Update venue averages
        updateVenueAverages(venueId);
        
        return saved;
    }

    public List<VenueReview> getReviews(UUID venueId) {
        return reviewRepository.findByVenueId(venueId);
    }

    private void updateVenueAverages(UUID venueId) {
        List<VenueReview> reviews = reviewRepository.findByVenueId(venueId);
        if (reviews.isEmpty()) return;

        double noise = reviews.stream().filter(r -> r.getNoiseLevel() != null).mapToInt(VenueReview::getNoiseLevel).average().orElse(0);
        double light = reviews.stream().filter(r -> r.getLightLevel() != null).mapToInt(VenueReview::getLightLevel).average().orElse(0);
        double crowd = reviews.stream().filter(r -> r.getCrowdLevel() != null).mapToInt(VenueReview::getCrowdLevel).average().orElse(0);

        Venue venue = getVenue(venueId);
        venue.setAvgNoiseLevel(noise);
        venue.setAvgLightLevel(light);
        venue.setAvgCrowdLevel(crowd);
        venueRepository.save(venue);
    }
}
