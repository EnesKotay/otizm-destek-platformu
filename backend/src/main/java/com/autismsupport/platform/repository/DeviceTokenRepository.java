package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.DeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DeviceTokenRepository extends JpaRepository<DeviceToken, UUID> {
    Optional<DeviceToken> findByToken(String token);

    List<DeviceToken> findByUserId(UUID userId);

    void deleteByUserIdAndToken(UUID userId, String token);

    @Transactional
    void deleteByTokenIn(Collection<String> tokens);
}
