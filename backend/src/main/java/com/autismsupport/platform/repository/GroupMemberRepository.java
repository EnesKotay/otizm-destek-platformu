package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface GroupMemberRepository extends JpaRepository<GroupMember, UUID> {
    Optional<GroupMember> findByGroupIdAndUserId(UUID groupId, UUID userId);
    boolean existsByGroupIdAndUserId(UUID groupId, UUID userId);
    void deleteByGroupIdAndUserId(UUID groupId, UUID userId);
}
