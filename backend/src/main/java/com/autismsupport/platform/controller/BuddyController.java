package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.BuddyDto;
import com.autismsupport.platform.model.BuddyRelationship;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.BuddyRelationshipService;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/buddies")
@RequiredArgsConstructor
public class BuddyController {

    private final BuddyRelationshipService buddyRelationshipService;

    @PostMapping("/request")
    public ResponseEntity<ApiResponse<BuddyRelationship>> sendBuddyRequest(
            @RequestBody BuddyRequestPayload payload,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                buddyRelationshipService.sendBuddyRequest(
                        principal.getId(),
                        payload.getReceiverId(),
                        payload.isMentorRequest(),
                        payload.getMessage()
                )
        ));
    }

    @PostMapping("/accept/{id}")
    public ResponseEntity<ApiResponse<BuddyRelationship>> acceptBuddyRequest(
            @PathVariable UUID id,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                buddyRelationshipService.acceptBuddyRequest(principal.getId(), id)
        ));
    }

    @PostMapping("/reject/{id}")
    public ResponseEntity<ApiResponse<Void>> rejectBuddyRequest(
            @PathVariable UUID id,
            @CurrentUser UserPrincipal principal) {
        buddyRelationshipService.rejectBuddyRequest(principal.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Istek basariyla reddedildi", null));
    }

    @DeleteMapping("/remove/{id}")
    public ResponseEntity<ApiResponse<Void>> removeBuddy(
            @PathVariable UUID id,
            @CurrentUser UserPrincipal principal) {
        buddyRelationshipService.removeBuddy(principal.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Eslesme basariyla silindi", null));
    }

    @DeleteMapping("/request/{id}")
    public ResponseEntity<ApiResponse<Void>> withdrawRequest(@PathVariable UUID id, @CurrentUser UserPrincipal principal) {
        buddyRelationshipService.withdrawBuddyRequest(principal.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Tanışma isteği geri çekildi", null));
    }

    @GetMapping("/my-list")
    public ResponseEntity<ApiResponse<List<BuddyDto>>> getMyBuddies(@CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(buddyRelationshipService.getMyBuddies(principal.getId())));
    }

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<BuddyDto>>> getPendingRequests(@CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(buddyRelationshipService.getPendingRequests(principal.getId())));
    }

    @GetMapping("/nearby")
    public ResponseEntity<ApiResponse<List<BuddyDto>>> getNearbyProximityBuddies(
            @RequestParam(defaultValue = "15.0") double maxDistanceKm,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                buddyRelationshipService.getNearbyProximityBuddies(principal.getId(), maxDistanceKm)
        ));
    }

    @Data
    public static class BuddyRequestPayload {
        private UUID receiverId;
        @JsonProperty("isMentorRequest")
        private boolean isMentorRequest;
        private String message;
    }
}
