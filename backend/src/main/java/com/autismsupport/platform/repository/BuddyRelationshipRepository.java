package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.BuddyRelationship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BuddyRelationshipRepository extends JpaRepository<BuddyRelationship, UUID> {

    @Query("SELECT r FROM BuddyRelationship r WHERE (r.requester.id = :userId OR r.receiver.id = :userId) AND r.status = :status")
    List<BuddyRelationship> findByUserIdAndStatus(@Param("userId") UUID userId, @Param("status") String status);

    @Query("SELECT r FROM BuddyRelationship r WHERE (r.requester.id = :user1Id AND r.receiver.id = :user2Id) OR (r.requester.id = :user2Id AND r.receiver.id = :user1Id)")
    Optional<BuddyRelationship> findBetweenUsers(@Param("user1Id") UUID user1Id, @Param("user2Id") UUID user2Id);

    List<BuddyRelationship> findByReceiverIdAndStatus(UUID receiverId, String status);
}
