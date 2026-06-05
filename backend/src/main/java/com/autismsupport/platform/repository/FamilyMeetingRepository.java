package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.FamilyMeeting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FamilyMeetingRepository extends JpaRepository<FamilyMeeting, UUID> {

    @Query("SELECT fm FROM FamilyMeeting fm WHERE fm.hostParent.id = :userId OR fm.guestParent.id = :userId ORDER BY fm.scheduledTime DESC")
    List<FamilyMeeting> findByUserId(@Param("userId") UUID userId);

}
