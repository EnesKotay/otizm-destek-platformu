package com.autismsupport.platform.repository;

import com.autismsupport.platform.model.PushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, UUID> {
    Optional<PushSubscription> findByEndpoint(String endpoint);

    List<PushSubscription> findByUserId(UUID userId);

    @Modifying
    @Query(value = """
            INSERT INTO push_subscriptions (
                user_id,
                endpoint,
                p256dh_key,
                auth_key,
                user_agent,
                last_seen_at
            ) VALUES (
                :userId,
                :endpoint,
                :p256dhKey,
                :authKey,
                :userAgent,
                :lastSeenAt
            )
            ON CONFLICT (endpoint) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                p256dh_key = EXCLUDED.p256dh_key,
                auth_key = EXCLUDED.auth_key,
                user_agent = EXCLUDED.user_agent,
                last_seen_at = EXCLUDED.last_seen_at,
                updated_at = CURRENT_TIMESTAMP
            """, nativeQuery = true)
    int upsert(
            @Param("userId") UUID userId,
            @Param("endpoint") String endpoint,
            @Param("p256dhKey") String p256dhKey,
            @Param("authKey") String authKey,
            @Param("userAgent") String userAgent,
            @Param("lastSeenAt") LocalDateTime lastSeenAt);

    void deleteByUserIdAndEndpoint(UUID userId, String endpoint);
}
