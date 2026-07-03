package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.DeviceTokenRequest;
import com.autismsupport.platform.model.DeviceToken;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.DeviceTokenRepository;
import com.autismsupport.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeviceTokenService {
    private final DeviceTokenRepository deviceTokenRepository;
    private final UserRepository userRepository;

    @Transactional
    public void upsertToken(UUID userId, DeviceTokenRequest request) {
        String token = normalizeToken(request.getToken());
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Kullanici bulunamadi."));

        DeviceToken deviceToken = deviceTokenRepository.findByToken(token)
                .orElseGet(() -> DeviceToken.builder().token(token).build());

        deviceToken.setUser(user);
        deviceToken.setPlatform(request.getPlatform());
        deviceTokenRepository.save(deviceToken);
    }

    @Transactional
    public void deleteToken(UUID userId, String token) {
        String normalized = normalizeToken(token);
        deviceTokenRepository.deleteByUserIdAndToken(userId, normalized);
    }

    private String normalizeToken(String token) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("FCM token zorunludur.");
        }
        return token.trim();
    }
}
