package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.CommunityMeetup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface CommunityMeetupRepository extends JpaRepository<CommunityMeetup, UUID> {
    List<CommunityMeetup> findByDateGreaterThanEqualOrderByDateAscTimeAsc(LocalDate date);

    List<CommunityMeetup> findByCityAndDateGreaterThanEqualOrderByDateAscTimeAsc(String city, LocalDate date);
}
