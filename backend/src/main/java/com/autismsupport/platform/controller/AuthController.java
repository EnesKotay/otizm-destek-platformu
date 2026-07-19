package com.autismsupport.platform.controller;

import com.autismsupport.platform.config.RateLimit;
import com.autismsupport.platform.dto.*;
import com.autismsupport.platform.exception.ResourceNotFoundException;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.UserRepository;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.JwtTokenProvider;
import com.autismsupport.platform.security.RequestOriginValidator;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.AuthService;
import com.autismsupport.platform.service.PasswordResetService;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final String REFRESH_COOKIE = "refresh_token";
    private static final String MEDIA_COOKIE = "media_session";

    private final AuthService authService;
    private final PasswordResetService passwordResetService;
    private final UserRepository userRepository;
    private final JwtTokenProvider tokenProvider;
    private final RequestOriginValidator requestOriginValidator;
    private final com.autismsupport.platform.service.EmailVerificationService emailVerificationService;
    private final com.autismsupport.platform.service.TurnstileService turnstileService;

    @Value("${app.auth.refresh-cookie-secure:false}")
    private boolean refreshCookieSecure;

    @RateLimit(limit = 30, duration = 60)
    @GetMapping("/check-email")
    public ResponseEntity<ApiResponse<EmailAvailabilityResponse>> checkEmail(@RequestParam String email) {
        boolean available = !userRepository.existsByEmail(email);
        return ResponseEntity.ok(ApiResponse.success(new EmailAvailabilityResponse(available)));
    }

    @RateLimit(limit = 20, duration = 60)
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request,
                                                               HttpServletRequest httpRequest) {
        turnstileService.verify(request.getCaptchaToken(), httpRequest.getRemoteAddr());
        AuthResponse response = authService.register(request);
        return authResponse("Kayit basarili", response);
    }

    @RateLimit(limit = 10, duration = 60)
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody AuthRequest request) {
        AuthResponse response = authService.login(request);
        return authResponse("Giris basarili", response);
    }

    @PostMapping("/mfa/verify")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyMfa(@Valid @RequestBody MfaVerifyRequest request) {
        AuthResponse response = authService.verifyMfa(request);
        return authResponse("MFA dogrulama basarili", response);
    }

    @PostMapping("/mfa/setup")
    public ResponseEntity<ApiResponse<MfaSetupResponse>> setupMfa(@CurrentUser UserPrincipal principal) {
        MfaSetupResponse response = authService.setupMfa(principal.getId());
        return ResponseEntity.ok(ApiResponse.success("MFA kurulumu baslatildi. Lutfen QR kodunu taratin.", response));
    }

    @PostMapping("/mfa/enable")
    public ResponseEntity<ApiResponse<Void>> enableMfa(@CurrentUser UserPrincipal principal, @RequestParam String code) {
        boolean enabled = authService.enableMfa(principal.getId(), code);
        if (enabled) {
            return ResponseEntity.ok(ApiResponse.success("MFA basariyla aktif edildi.", null));
        }
        return ResponseEntity.badRequest().body(ApiResponse.error("Dogrulama kodu gecersiz."));
    }

    @RateLimit(limit = 60, duration = 60)
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(
            @CookieValue(name = REFRESH_COOKIE, required = false) String cookieToken,
            @RequestBody(required = false) RefreshTokenRequest request,
            HttpServletRequest httpRequest
    ) {
        requestOriginValidator.validateCookieWrite(httpRequest);
        AuthResponse response = authService.refreshToken(resolveRefreshToken(cookieToken, request));
        return authResponse(null, response);
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @CookieValue(name = REFRESH_COOKIE, required = false) String cookieToken,
            @RequestBody(required = false) LogoutRequest request,
            HttpServletRequest httpRequest
    ) {
        requestOriginValidator.validateCookieWrite(httpRequest);
        String refreshToken = firstNonBlank(cookieToken, request == null ? null : request.getRefreshToken());
        if (refreshToken != null) {
            authService.logout(refreshToken);
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, clearRefreshCookie().toString())
                .header(HttpHeaders.SET_COOKIE, clearMediaCookie().toString())
                .body(ApiResponse.success("Cikis basarili", null));
    }

    @RateLimit(limit = 5, duration = 60)
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success(
                "Sifre sifirlama baglantisi e-posta adresinize gonderildiyse gelen kutunuza ulasacaktir.",
                null
        ));
    }

    @RateLimit(limit = 10, duration = 60)
    @PostMapping("/verify-email")
    public ResponseEntity<ApiResponse<Void>> verifyEmail(@Valid @RequestBody EmailVerificationRequest request) {
        emailVerificationService.verify(request.getToken());
        return ResponseEntity.ok(ApiResponse.success("E-posta adresiniz doğrulandı. Giriş yapabilirsiniz.", null));
    }

    @RateLimit(limit = 3, duration = 3600)
    @PostMapping("/resend-verification")
    public ResponseEntity<ApiResponse<Void>> resendVerification(@Valid @RequestBody ForgotPasswordRequest request) {
        emailVerificationService.resend(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success("Hesap uygunsa doğrulama e-postası yeniden gönderildi.", null));
    }

    @RateLimit(limit = 10, duration = 60)
    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.getToken(), request.getPassword());
        return ResponseEntity.ok(ApiResponse.success("Sifreniz basariyla guncellendi", null));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser(@CurrentUser UserPrincipal principal) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Kullanici bulunamadi"));
        return ResponseEntity.ok(ApiResponse.success(
                UserDto.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .fullName(user.getFullName())
                        .phone(user.getPhone())
                        .role(user.getRole().name())
                        .expertTitle(user.getExpertTitle())
                        .city(user.getCity())
                        .institution(user.getInstitution())
                        .licenseNumber(user.getLicenseNumber())
                        .bio(user.getBio())
                        .verified(user.isVerified())
                        .emailVerified(user.isEmailVerified())
                        .licenseVerified(user.isLicenseVerified())
                        .kvkkConsent(user.isKvkkConsent())
                        .isActive(user.isActive())
                        .specializations(user.getSpecializations())
                        .profileImageUrl(user.getProfileImageUrl())
                        .createdAt(user.getCreatedAt())
                        .build()
        ));
    }

    private ResponseEntity<ApiResponse<AuthResponse>> authResponse(String message, AuthResponse response) {
        ApiResponse<AuthResponse> body = message == null
                ? ApiResponse.success(response)
                : ApiResponse.success(message, response);
        ResponseEntity.BodyBuilder builder = ResponseEntity.ok();
        if (response.getRefreshToken() != null && !response.getRefreshToken().isBlank()) {
            builder.header(HttpHeaders.SET_COOKIE, refreshCookie(response.getRefreshToken()).toString());
        }
        if (response.getAccessToken() != null && !response.getAccessToken().isBlank()) {
            builder.header(HttpHeaders.SET_COOKIE, mediaCookie(response.getAccessToken()).toString());
        }
        return builder.body(body);
    }

    private String resolveRefreshToken(String cookieToken, RefreshTokenRequest request) {
        String token = firstNonBlank(cookieToken, request == null ? null : request.getRefreshToken());
        if (token == null) {
            throw new com.autismsupport.platform.exception.ValidationException("Refresh token zorunludur");
        }
        return token;
    }

    private String firstNonBlank(String primary, String fallback) {
        if (primary != null && !primary.isBlank()) return primary;
        if (fallback != null && !fallback.isBlank()) return fallback;
        return null;
    }

    private ResponseCookie refreshCookie(String token) {
        return ResponseCookie.from(REFRESH_COOKIE, token)
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .sameSite("Strict")
                .path("/api/auth")
                .maxAge(tokenProvider.getRefreshTokenExpirationMs() / 1000)
                .build();
    }

    private ResponseCookie clearRefreshCookie() {
        return ResponseCookie.from(REFRESH_COOKIE, "")
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .sameSite("Strict")
                .path("/api/auth")
                .maxAge(0)
                .build();
    }

    private ResponseCookie mediaCookie(String token) {
        return ResponseCookie.from(MEDIA_COOKIE, token)
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .sameSite("Strict")
                .path("/api/upload")
                .maxAge(tokenProvider.getAccessTokenExpirationMs() / 1000)
                .build();
    }

    private ResponseCookie clearMediaCookie() {
        return ResponseCookie.from(MEDIA_COOKIE, "")
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .sameSite("Strict")
                .path("/api/upload")
                .maxAge(0)
                .build();
    }
}
