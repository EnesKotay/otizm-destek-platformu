package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.MeetupRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface MeetupRequestRepository extends JpaRepository<MeetupRequest, UUID> {

    @Query("SELECT m FROM MeetupRequest m WHERE m.requester.id = :userId OR m.recipient.id = :userId ORDER BY m.proposedDate DESC, m.proposedTime DESC")
    List<MeetupRequest> findByUserId(@Param("userId") UUID userId);

    List<MeetupRequest> findByRecipientIdAndStatus(UUID recipientId, String status);
}
