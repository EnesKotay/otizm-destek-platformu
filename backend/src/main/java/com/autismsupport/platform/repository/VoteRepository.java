package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.Vote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface VoteRepository extends JpaRepository<Vote, UUID> {
    Optional<Vote> findByUserIdAndTargetTypeAndTargetId(UUID userId, String targetType, UUID targetId);
    boolean existsByUserIdAndTargetTypeAndTargetId(UUID userId, String targetType, UUID targetId);
    long countByTargetTypeAndTargetIdAndVoteValue(String targetType, UUID targetId, int voteValue);
}
