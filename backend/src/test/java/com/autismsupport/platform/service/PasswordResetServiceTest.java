package com.autismsupport.platform.service;

import com.autismsupport.platform.model.PasswordResetToken;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.PasswordResetTokenRepository;
import com.autismsupport.platform.repository.RefreshTokenRepository;
import com.autismsupport.platform.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {
    @Mock PasswordResetTokenRepository tokenRepository;
    @Mock RefreshTokenRepository refreshTokenRepository;
    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock EmailService emailService;
    @InjectMocks PasswordResetService service;

    @Test
    void resetPasswordRevokesAllExistingSessions() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().id(userId).email("parent@example.com").build();
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .user(user)
                .token("hash")
                .expiresAt(LocalDateTime.now().plusMinutes(30))
                .used(false)
                .build();
        when(tokenRepository.findByTokenAndUsedFalse(anyString())).thenReturn(Optional.of(resetToken));
        when(passwordEncoder.encode("NewPassword1!")).thenReturn("new-hash");

        service.resetPassword("valid-token", "NewPassword1!");

        verify(refreshTokenRepository).deleteByUserId(userId);
        verify(userRepository).save(user);
        verify(tokenRepository).save(resetToken);
    }
}
