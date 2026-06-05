package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.PushSubscriptionRequest;
import com.autismsupport.platform.model.PushSubscription;
import com.autismsupport.platform.model.User;
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
        if (request.getP256dh() == null || request.getAuth() == null) {
            throw new IllegalArgumentException("Push abonelik anahtarlari eksik.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Kullanici bulunamadi."));

        PushSubscription subscription = pushSubscriptionRepository.findByEndpoint(request.getEndpoint())
                .orElseGet(() -> PushSubscription.builder().endpoint(request.getEndpoint()).build());

        subscription.setUser(user);
        subscription.setP256dhKey(request.getP256dh());
        subscription.setAuthKey(request.getAuth());
        subscription.setUserAgent(userAgent);
        subscription.setLastSeenAt(LocalDateTime.now());
        pushSubscriptionRepository.save(subscription);
    }

    @Transactional
    public void unsubscribe(UUID userId, PushSubscriptionRequest request) {
        pushSubscriptionRepository.deleteByUserIdAndEndpoint(userId, request.getEndpoint());
    }
}
