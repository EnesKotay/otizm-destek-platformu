package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.GroupMeeting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface GroupMeetingRepository extends JpaRepository<GroupMeeting, UUID> {
    List<GroupMeeting> findByGroupIdOrderByStartTimeAsc(UUID groupId);
    List<GroupMeeting> findByGroupIdAndStartTimeAfterOrderByStartTimeAsc(UUID groupId, LocalDateTime time);
}
