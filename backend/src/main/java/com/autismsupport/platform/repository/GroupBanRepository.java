package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.GroupBan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface GroupBanRepository extends JpaRepository<GroupBan, UUID> {
    boolean existsByGroupIdAndUserId(UUID groupId, UUID userId);
    Optional<GroupBan> findByGroupIdAndUserId(UUID groupId, UUID userId);
    void deleteByGroupIdAndUserId(UUID groupId, UUID userId);
}
