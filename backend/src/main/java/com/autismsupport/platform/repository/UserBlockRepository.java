package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.UserBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserBlockRepository extends JpaRepository<UserBlock, UUID> {
    Optional<UserBlock> findByBlockerIdAndBlockedId(UUID blockerId, UUID blockedId);
    List<UserBlock> findByBlockerId(UUID blockerId);
    @Query("select count(b) > 0 from UserBlock b where (b.blocker.id=:a and b.blocked.id=:b) or (b.blocker.id=:b and b.blocked.id=:a)")
    boolean existsBetween(UUID a, UUID b);
}
