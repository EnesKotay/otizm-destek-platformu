package com.autismsupport.platform.service;

import com.autismsupport.platform.model.PasswordResetToken;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.PasswordResetTokenRepository;
import com.autismsupport.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService {
    private final SecureRandom secureRandom = new SecureRandom();

    private final PasswordResetTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Transactional
    public void requestReset(String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            // Don't reveal whether email exists
            log.info("Password reset requested for an unknown account");
            return;
        }

        tokenRepository.deleteByUserId(user.getId());

        byte[] tokenBytes = new byte[32];
        secureRandom.nextBytes(tokenBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .user(user)
                .token(hash(token))
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build();
        tokenRepository.save(resetToken);

        // Send actual email via EmailService
        emailService.sendPasswordResetEmail(email, token);

        log.info("Password reset email queued for userId={}", user.getId());
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = tokenRepository.findByTokenAndUsedFalse(hash(token))
                .or(() -> tokenRepository.findByTokenAndUsedFalse(token)) // önceki sürümde üretilmiş bağlantılar
                .orElseThrow(() -> new RuntimeException("Gecersiz veya suresi dolmus sifirlama baglantisi."));

        if (resetToken.isExpired()) {
            throw new RuntimeException("Sifirlama baglantisinin suresi dolmus. Lutfen yeni bir talep gonderin.");
        }

        User user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        resetToken.setUsed(true);
        tokenRepository.save(resetToken);
    }

    private String hash(String token) {
        try {
            return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Şifre sıfırlama tokenı hazırlanamadı", e);
        }
    }
}
