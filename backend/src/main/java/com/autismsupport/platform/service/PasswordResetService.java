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
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private final PasswordResetTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Transactional
    public void requestReset(String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            // Don't reveal whether email exists
            log.info("Password reset requested for non-existent email: {}", email);
            return;
        }

        tokenRepository.deleteByUserId(user.getId());

        String token = UUID.randomUUID().toString();
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .user(user)
                .token(token)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build();
        tokenRepository.save(resetToken);

        // Send actual email via EmailService
        emailService.sendPasswordResetEmail(email, token);

        log.info("=== PASSWORD RESET TOKEN SENT ===");
        log.info("Email: {}", email);
        log.info("===========================");
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = tokenRepository.findByTokenAndUsedFalse(token)
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
}
