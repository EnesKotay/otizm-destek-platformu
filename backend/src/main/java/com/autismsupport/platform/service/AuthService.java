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

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Bu e-posta adresi zaten kullanılıyor");
        }

        if (!request.isKvkkConsent()) {
            throw new ValidationException("KVKK onayı zorunludur");
        }

        boolean isExpert = "EXPERT".equalsIgnoreCase(request.getRole());

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .role(isExpert ? UserRole.EXPERT : UserRole.PARENT)
                .verified(false)
                .expertTitle(request.getExpertTitle())
                .institution(request.getInstitution())
                .licenseNumber(request.getLicenseNumber())
                .bio(request.getBio())
                .kvkkConsent(true)
                .kvkkConsentDate(LocalDateTime.now())
                .build();

        user = userRepository.save(user);
        return createAuthResponse(user);
    }

    @Transactional
    public AuthResponse login(AuthRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));

        if (!user.isActive()) {
            throw new ValidationException("Hesabınız askıya alınmıştır. Lütfen destek ekibiyle iletişime geçin.");
        }

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        return createAuthResponse(user);
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
                .kvkkConsent(user.isKvkkConsent())
                .profileImageUrl(user.getProfileImageUrl())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
