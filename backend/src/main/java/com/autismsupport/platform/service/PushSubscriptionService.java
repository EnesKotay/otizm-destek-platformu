package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.PushSubscriptionRequest;
import com.autismsupport.platform.repository.PushSubscriptionRepository;
import com.autismsupport.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PushSubscriptionService {
    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final UserRepository userRepository;

    @Value("${app.push.vapid-public-key:}")
    private String vapidPublicKey;

    public Map<String, String> getVapidPublicKey() {
        return Map.of("publicKey", vapidPublicKey == null ? "" : vapidPublicKey);
    }

    @Transactional
    public void subscribe(UUID userId, PushSubscriptionRequest request, String userAgent) {
        if (request.getP256dh() == null || request.getP256dh().isBlank()
                || request.getAuth() == null || request.getAuth().isBlank()) {
            throw new IllegalArgumentException("Push abonelik anahtarlari eksik.");
        }

        userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Kullanici bulunamadi."));

        pushSubscriptionRepository.upsert(
                userId,
                request.getEndpoint(),
                request.getP256dh(),
                request.getAuth(),
                userAgent,
                LocalDateTime.now());
    }

    @Transactional
    public void unsubscribe(UUID userId, PushSubscriptionRequest request) {
        pushSubscriptionRepository.deleteByUserIdAndEndpoint(userId, request.getEndpoint());
    }
}
