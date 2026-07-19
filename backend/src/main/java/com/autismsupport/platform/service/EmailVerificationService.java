package com.autismsupport.platform.service;

import com.autismsupport.platform.exception.ValidationException;
import com.autismsupport.platform.model.EmailVerificationToken;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.EmailVerificationTokenRepository;
import com.autismsupport.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class EmailVerificationService {
    private final EmailVerificationTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final SecureRandom random = new SecureRandom();

    @Transactional
    public void issue(User user) {
        tokenRepository.deleteByUserId(user.getId());
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokenRepository.save(EmailVerificationToken.builder()
                .user(user).tokenHash(hash(rawToken)).expiresAt(LocalDateTime.now().plusHours(24)).build());
        emailService.sendEmailVerification(user.getEmail(), rawToken);
    }

    @Transactional
    public void verify(String rawToken) {
        EmailVerificationToken token = tokenRepository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new ValidationException("Doğrulama bağlantısı geçersiz"));
        if (token.getUsedAt() != null || token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ValidationException("Doğrulama bağlantısının süresi dolmuş veya daha önce kullanılmış");
        }
        User user = token.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);
        token.setUsedAt(LocalDateTime.now());
        tokenRepository.save(token);
    }

    @Transactional
    public void resend(String email) {
        userRepository.findByEmail(email).filter(user -> !user.isEmailVerified()).ifPresent(this::issue);
    }

    private String hash(String token) {
        try {
            return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Doğrulama tokenı hazırlanamadı", e);
        }
    }
}
