package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.model.Venue;
import com.autismsupport.platform.model.VenueReview;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.VenueService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/venues")
@RequiredArgsConstructor
public class VenueController {

    private final VenueService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Venue>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(service.getAllVenues()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Venue>> create(@RequestBody Venue venue, @CurrentUser UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.success(service.addVenue(venue)));
    }

    @GetMapping("/{id}/reviews")
    public ResponseEntity<ApiResponse<List<VenueReview>>> getReviews(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(service.getReviews(id)));
    }

    @PostMapping("/{id}/reviews")
    public ResponseEntity<ApiResponse<VenueReview>> addReview(
            @PathVariable UUID id,
            @RequestBody VenueReview review,
            @CurrentUser UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.success(service.addReview(id, p.getId(), review)));
    }
}
