package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.CommunityMeetupAttendee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CommunityMeetupAttendeeRepository extends JpaRepository<CommunityMeetupAttendee, UUID> {
    Optional<CommunityMeetupAttendee> findByMeetupIdAndUserId(UUID meetupId, UUID userId);

    boolean existsByMeetupIdAndUserId(UUID meetupId, UUID userId);

    long countByMeetupId(UUID meetupId);
}
