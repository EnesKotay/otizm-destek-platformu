package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.AuthResponse;
import com.autismsupport.platform.dto.RegisterRequest;
import com.autismsupport.platform.dto.MfaSetupResponse;
import com.autismsupport.platform.dto.MfaVerifyRequest;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.model.UserRole;
import com.autismsupport.platform.repository.RefreshTokenRepository;
import com.autismsupport.platform.repository.UserRepository;
import com.autismsupport.platform.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;
import java.time.LocalDateTime;
import com.autismsupport.platform.model.RefreshToken;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService unit testleri")
class AuthServiceTest {

    @Mock UserRepository userRepository;
    @Mock RefreshTokenRepository refreshTokenRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtTokenProvider tokenProvider;
    @Mock AuthenticationManager authenticationManager;
    @Mock NotificationService notificationService;
    @Mock PlatformSettingsService platformSettingsService;
    @Mock EmailVerificationService emailVerificationService;
    @Mock MfaService mfaService;

    @InjectMocks AuthService authService;

    private RegisterRequest validRequest;

    @BeforeEach
    void setUp() {
        validRequest = new RegisterRequest();
        validRequest.setEmail("test@example.com");
        validRequest.setPassword("password123");
        validRequest.setFullName("Test Kullanıcı");
        validRequest.setKvkkConsent(true);
        validRequest.setRole("PARENT");
    }

    @Test
    @DisplayName("Kayıt: aynı e-posta ikiynci kez kullanılamaz")
    void register_duplicateEmail_throwsException() {
        when(userRepository.existsByEmail("test@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(validRequest))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("zaten kullanılıyor");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Kayıt: KVKK onayı olmadan kayıt yapılamaz")
    void register_withoutKvkk_throwsException() {
        when(userRepository.existsByEmail(any())).thenReturn(false);
        validRequest.setKvkkConsent(false);

        assertThatThrownBy(() -> authService.register(validRequest))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("KVKK");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Kayıt: geçerli istek ile kullanıcı kaydedilir ve token döner")
    void register_validRequest_savesUserAndReturnsTokens() {
        when(userRepository.existsByEmail(any())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("hashed_password");

        User saved = User.builder()
                .id(UUID.randomUUID())
                .email(validRequest.getEmail())
                .fullName(validRequest.getFullName())
                .role(UserRole.PARENT)
                .kvkkConsent(true)
                .verified(false)
                .build();
        when(userRepository.save(any())).thenReturn(saved);
        when(tokenProvider.generateAccessToken(any(), any(), any())).thenReturn("access_token");
        when(tokenProvider.generateRefreshToken(any())).thenReturn("refresh_token");

        AuthResponse response = authService.register(validRequest);

        verify(userRepository).save(any());
        assert response.getAccessToken().equals("access_token");
        assert response.getUser().getEmail().equals("test@example.com");
    }

    @Test
    @DisplayName("Kayıt: uzman başvurusu token üretmeden beklemeye alınır")
    void register_expertRole_isPendingWithoutTokens() {
        when(userRepository.existsByEmail(any())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("hashed");

        validRequest.setRole("EXPERT");
        validRequest.setExpertTitle("Dil Terapisti");
        validRequest.setLicenseNumber("LIC-123");

        User saved = User.builder()
                .id(UUID.randomUUID())
                .email(validRequest.getEmail())
                .fullName(validRequest.getFullName())
                .role(UserRole.EXPERT)
                .kvkkConsent(true)
                .verified(false)
                .build();
        when(userRepository.save(any())).thenReturn(saved);
        AuthResponse response = authService.register(validRequest);

        verify(userRepository).save(argThat(u -> u.getRole() == UserRole.EXPERT));
        assert response.isPendingApproval();
        assert response.getAccessToken() == null;
        verify(tokenProvider, never()).generateAccessToken(any(), any(), any());
        verify(refreshTokenRepository, never()).save(any());
    }

    @Test
    @DisplayName("Kayıt: yönetici ve öğretmen rolleri public endpoint üzerinden alınamaz")
    void register_privilegedRoles_areRejected() {
        when(userRepository.existsByEmail(any())).thenReturn(false);

        validRequest.setRole("ADMIN");
        assertThatThrownBy(() -> authService.register(validRequest))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("doğrudan kayıt");

        validRequest.setRole("TEACHER");
        assertThatThrownBy(() -> authService.register(validRequest))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("doğrudan kayıt");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("refreshToken: gecerli ve kullanilmamis token ile yeni token cifti uretilir ve eski token kullanildi olarak isaretlenir")
    void refreshToken_validUnusedToken_returnsNewResponseAndMarksUsed() {
        String tokenStr = "valid_unused_token";
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("test@example.com")
                .role(UserRole.PARENT)
                .build();
        RefreshToken refreshToken = RefreshToken.builder()
                .token(tokenStr)
                .user(user)
                .used(false)
                .expiresAt(LocalDateTime.now().plusDays(1))
                .build();

        when(refreshTokenRepository.findByToken(tokenStr)).thenReturn(java.util.Optional.of(refreshToken));
        when(tokenProvider.validateRefreshToken(tokenStr)).thenReturn(true);
        when(tokenProvider.generateAccessToken(any(), any(), any())).thenReturn("new_access_token");
        when(tokenProvider.generateRefreshToken(any())).thenReturn("new_refresh_token");
        when(tokenProvider.getRefreshTokenExpirationMs()).thenReturn(86400000L);

        AuthResponse response = authService.refreshToken(tokenStr);

        assert response.getAccessToken().equals("new_access_token");
        assert response.getRefreshToken().equals("new_refresh_token");
        assert refreshToken.isUsed();
        verify(refreshTokenRepository).save(refreshToken);
    }

    @Test
    @DisplayName("refreshToken: kullanilmis token tekrar sunuldugunda guvenlik uyarisi verir ve kullanicinin tum oturumlarini sonlandirir")
    void refreshToken_reusedToken_deletesAllUserTokensAndThrowsSecurityAlert() {
        String tokenStr = "reused_token";
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("test@example.com")
                .role(UserRole.PARENT)
                .build();
        RefreshToken refreshToken = RefreshToken.builder()
                .token(tokenStr)
                .user(user)
                .used(true)
                .expiresAt(LocalDateTime.now().plusDays(1))
                .build();

        when(refreshTokenRepository.findByToken(tokenStr)).thenReturn(java.util.Optional.of(refreshToken));

        assertThatThrownBy(() -> authService.refreshToken(tokenStr))
                .isInstanceOf(org.springframework.security.authentication.BadCredentialsException.class)
                .hasMessageContaining("daha önce kullanılmış");

        verify(refreshTokenRepository).deleteByUserId(userId);
        verify(refreshTokenRepository, never()).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("MFA Setup: Kullanıcı için secret oluşturur ve QR URL döner")
    void setupMfa_generatesSecretAndReturnsQrCode() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().id(userId).email("admin@example.com").build();
        when(userRepository.findById(userId)).thenReturn(java.util.Optional.of(user));
        when(mfaService.generateSecret()).thenReturn("SECRET123");
        when(mfaService.getQrCodeUrl(eq("admin@example.com"), eq("SECRET123"))).thenReturn("otpauth://test");

        MfaSetupResponse response = authService.setupMfa(userId);

        assertThat(response.getSecret()).isEqualTo("SECRET123");
        assertThat(response.getQrCodeUrl()).isEqualTo("otpauth://test");
        assertThat(user.getMfaSecret()).isEqualTo("SECRET123");
        assertThat(user.isMfaEnabled()).isFalse();
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("MFA Enable: Doğru kod girildiğinde MFA'yı aktif eder")
    void enableMfa_withValidCode_enablesMfaAndReturnsTrue() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().id(userId).mfaSecret("SECRET123").mfaEnabled(false).build();
        when(userRepository.findById(userId)).thenReturn(java.util.Optional.of(user));
        when(mfaService.verifyCode("SECRET123", "123456")).thenReturn(true);

        boolean result = authService.enableMfa(userId, "123456");

        assertThat(result).isTrue();
        assertThat(user.isMfaEnabled()).isTrue();
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("MFA Enable: Yanlış kod girildiğinde MFA'yı aktif etmez ve false döner")
    void enableMfa_withInvalidCode_returnsFalse() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().id(userId).mfaSecret("SECRET123").mfaEnabled(false).build();
        when(userRepository.findById(userId)).thenReturn(java.util.Optional.of(user));
        when(mfaService.verifyCode("SECRET123", "111111")).thenReturn(false);

        boolean result = authService.enableMfa(userId, "111111");

        assertThat(result).isFalse();
        assertThat(user.isMfaEnabled()).isFalse();
        verify(userRepository, never()).save(any(User.class));
    }
}
