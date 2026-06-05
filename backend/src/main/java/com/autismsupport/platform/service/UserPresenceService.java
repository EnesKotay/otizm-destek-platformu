package com.autismsupport.platform.service;

import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserPresenceService {

    private final StringRedisTemplate redisTemplate;
    private static final String REDIS_KEY = "online_users";

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        Principal principal = event.getUser();
        if (principal != null) {
            try {
                UUID userId = UUID.fromString(principal.getName());
                redisTemplate.opsForSet().add(REDIS_KEY, userId.toString());
            } catch (Exception e) {
                // Ignore invalid UUID
            }
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        Principal principal = event.getUser();
        if (principal != null) {
            try {
                UUID userId = UUID.fromString(principal.getName());
                redisTemplate.opsForSet().remove(REDIS_KEY, userId.toString());
            } catch (Exception e) {
                // Ignore invalid UUID
            }
        }
    }

    public boolean isUserOnline(UUID userId) {
        Boolean isMember = redisTemplate.opsForSet().isMember(REDIS_KEY, userId.toString());
        return Boolean.TRUE.equals(isMember);
    }

    public java.util.Map<UUID, Boolean> getOnlineStatusBatch(java.util.List<UUID> userIds) {
        java.util.Map<UUID, Boolean> result = new java.util.HashMap<>();
        if (userIds == null || userIds.isEmpty()) return result;
        for (UUID userId : userIds) {
            result.put(userId, isUserOnline(userId));
        }
        return result;
    }
}
