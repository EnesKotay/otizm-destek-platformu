package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.*;
import com.autismsupport.platform.model.RefreshToken;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.model.UserRole;
import com.autismsupport.platform.exception.ConflictException;
import com.autismsupport.platform.exception.ResourceNotFoundException;
import com.autismsupport.platform.exception.ValidationException;
import com.autismsupport.platform.repository.RefreshTokenRepository;
import com.autismsupport.platform.repository.UserRepository;
import com.autismsupport.platform.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final AuthenticationManager authenticationManager;
    private final PlatformSettingsService platformSettingsService;
    private final EmailVerificationService emailVerificationService;
    private final MfaService mfaService;

    @org.springframework.beans.factory.annotation.Value("${app.auth.require-email-verification:false}")
    private boolean requireEmailVerification;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        platformSettingsService.requireRegistrationsOpen();
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Bu e-posta adresi zaten kullanılıyor");
        }

        if (!request.isKvkkConsent()) {
            throw new ValidationException("KVKK onayı zorunludur");
        }

        UserRole role = resolvePublicRegistrationRole(request);

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .city(request.getCity())
                .role(role)
                .verified(false)
                .emailVerified(!requireEmailVerification)
                .expertTitle(request.getExpertTitle())
                .institution(request.getInstitution())
                .licenseNumber(request.getLicenseNumber())
                .licenseDocumentUrl(request.getLicenseDocumentUrl())
                .bio(request.getBio())
                .specializations(request.getSpecializations())
                .kvkkConsent(true)
                .kvkkConsentDate(LocalDateTime.now())
                .build();

        user = userRepository.save(user);
        if (requireEmailVerification) emailVerificationService.issue(user);
        if (role == UserRole.EXPERT) {
            return AuthResponse.builder()
                    .user(toUserDto(user))
                    .pendingApproval(true)
                    .pendingEmailVerification(requireEmailVerification)
                    .build();
        }
        if (requireEmailVerification) {
            return AuthResponse.builder()
                    .user(toUserDto(user))
                    .pendingEmailVerification(true)
                    .build();
        }
        return createAuthResponse(user);
    }

    @Transactional
    public AuthResponse login(AuthRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));

        if (!user.isActive()) {
            throw new ValidationException("Hesabınız askıya alınmıştır. Lütfen destek ekibiyle iletişime geçin.");
        }
        ensureMayAuthenticate(user);

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        if (user.isMfaEnabled()) {
            String mfaToken = tokenProvider.generateAccessToken(user.getId(), user.getEmail(), "MFA_PENDING");
            return AuthResponse.builder()
                    .mfaRequired(true)
                    .mfaToken(mfaToken)
                    .user(toUserDto(user))
                    .build();
        }

        return createAuthResponse(user);
    }

    @Transactional
    public AuthResponse verifyMfa(MfaVerifyRequest request) {
        if (!tokenProvider.validateAccessToken(request.getMfaToken())) {
            throw new org.springframework.security.authentication.BadCredentialsException("Geçersiz veya süresi dolmuş MFA oturumu");
        }

        String role = tokenProvider.getRoleFromToken(request.getMfaToken());
        if (!"MFA_PENDING".equals(role)) {
            throw new org.springframework.security.authentication.BadCredentialsException("Geçersiz MFA yetkisi");
        }

        UUID userId = tokenProvider.getUserIdFromToken(request.getMfaToken());
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));

        if (!user.isMfaEnabled()) {
            throw new ValidationException("MFA bu kullanıcı için aktif edilmemiş");
        }

        boolean isValid = mfaService.verifyCode(user.getMfaSecret(), request.getCode());
        if (!isValid) {
            throw new org.springframework.security.authentication.BadCredentialsException("Doğrulama kodu hatalı");
        }

        return createAuthResponse(user);
    }

    @Transactional
    public MfaSetupResponse setupMfa(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));

        String secret = mfaService.generateSecret();
        user.setMfaSecret(secret);
        user.setMfaEnabled(false); // Enable only after first successful code verification
        userRepository.save(user);

        String qrCodeUrl = mfaService.getQrCodeUrl(user.getEmail(), secret);
        return MfaSetupResponse.builder()
                .secret(secret)
                .qrCodeUrl(qrCodeUrl)
                .build();
    }

    @Transactional
    public boolean enableMfa(UUID userId, String code) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));

        if (user.getMfaSecret() == null || user.getMfaSecret().isBlank()) {
            throw new ValidationException("Önce MFA kurulumu başlatılmalıdır");
        }

        boolean isValid = mfaService.verifyCode(user.getMfaSecret(), code);
        if (isValid) {
            user.setMfaEnabled(true);
            userRepository.save(user);
            return true;
        }
        return false;
    }

    @Transactional
    public AuthResponse refreshToken(String refreshTokenStr) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(refreshTokenStr)
                .orElseThrow(() -> new BadCredentialsException("Geçersiz refresh token"));

        if (refreshToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(refreshToken);
            throw new BadCredentialsException("Refresh token süresi dolmuş");
        }

        User user = refreshToken.getUser();
        ensureMayAuthenticate(user);

        if (refreshToken.isUsed()) {
            refreshTokenRepository.deleteByUserId(user.getId());
            throw new BadCredentialsException("Güvenlik Uyarısı: Bu refresh token daha önce kullanılmış. Tüm oturumlar sonlandırıldı.");
        }

        if (!tokenProvider.validateRefreshToken(refreshTokenStr)) {
            throw new BadCredentialsException("Geçersiz refresh token");
        }

        refreshToken.setUsed(true);
        refreshTokenRepository.save(refreshToken);

        return createAuthResponse(user);
    }

    @Transactional
    public void logout(String refreshTokenStr) {
        refreshTokenRepository.findByToken(refreshTokenStr)
                .ifPresent(refreshTokenRepository::delete);
    }

    private AuthResponse createAuthResponse(User user) {
        String accessToken = tokenProvider.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());
        String refreshTokenStr = tokenProvider.generateRefreshToken(user.getId());

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(refreshTokenStr)
                .expiresAt(LocalDateTime.now().plusSeconds(tokenProvider.getRefreshTokenExpirationMs() / 1000))
                .build();
        refreshTokenRepository.save(refreshToken);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenStr)
                .user(toUserDto(user))
                .build();
    }

    private UserRole resolvePublicRegistrationRole(RegisterRequest request) {
        String requestedRole = request.getRole();
        if (requestedRole == null || requestedRole.isBlank() || "PARENT".equalsIgnoreCase(requestedRole)) {
            return UserRole.PARENT;
        }
        if ("EXPERT".equalsIgnoreCase(requestedRole)) {
            if (request.getExpertTitle() == null || request.getExpertTitle().isBlank()
                    || request.getLicenseNumber() == null || request.getLicenseNumber().isBlank()) {
                throw new ValidationException("Uzman kaydı için unvan ve lisans numarası zorunludur");
            }
            return UserRole.EXPERT;
        }
        throw new ValidationException("Bu rol ile doğrudan kayıt yapılamaz");
    }

    private void ensureMayAuthenticate(User user) {
        if (requireEmailVerification && !user.isEmailVerified()) {
            throw new ValidationException("Giriş yapmadan önce e-posta adresinizi doğrulayın");
        }
        if ((user.getRole() == UserRole.EXPERT || user.getRole() == UserRole.TEACHER) && !user.isVerified()) {
            throw new ValidationException("Profesyonel hesabınız henüz yönetici tarafından onaylanmadı");
        }
    }

    private UserDto toUserDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .role(user.getRole().name())
                .expertTitle(user.getExpertTitle())
                .city(user.getCity())
                .verified(user.isVerified())
                .emailVerified(user.isEmailVerified())
                .kvkkConsent(user.isKvkkConsent())
                .consentAiAnalysis(user.isConsentAiAnalysis())
                .consentAiAnalysisDate(user.getConsentAiAnalysisDate())
                .consentEmergencyCard(user.isConsentEmergencyCard())
                .consentEmergencyCardDate(user.getConsentEmergencyCardDate())
                .profileImageUrl(user.getProfileImageUrl())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
