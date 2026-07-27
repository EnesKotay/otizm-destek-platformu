package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.UserDto;
import com.autismsupport.platform.exception.ResourceNotFoundException;
import com.autismsupport.platform.exception.ValidationException;
import com.autismsupport.platform.model.ConsentType;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.UserRepository;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.ConsentService;
import com.autismsupport.platform.service.EmergencyCardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.autismsupport.platform.service.AccountDataService accountDataService;
    private final com.autismsupport.platform.service.AccountDeletionService accountDeletionService;
    private final com.autismsupport.platform.repository.UserBlockRepository userBlockRepository;
    private final ConsentService consentService;
    private final EmergencyCardService emergencyCardService;

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<UserDto>>> searchUsers(@RequestParam String q) {
        if (q == null || q.trim().length() < 2) return ResponseEntity.ok(ApiResponse.success(List.of()));
        List<UserDto> users = userRepository.searchByName(q.trim()).stream()
                .limit(20)
                .map(this::toUserDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(users));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getProfile(@CurrentUser UserPrincipal principal) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new RuntimeException("Kullanici bulunamadi"));
        return ResponseEntity.ok(ApiResponse.success(toUserDto(user)));
    }

    @Transactional
    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> updateProfile(
            @CurrentUser UserPrincipal principal,
            @Valid @RequestBody com.autismsupport.platform.dto.UpdateProfileRequest body) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new RuntimeException("Kullanici bulunamadi"));

        if (body.getFullName() != null)
            user.setFullName(body.getFullName());
        if (body.getPhone() != null)
            user.setPhone(body.getPhone());
        if (body.getCity() != null)
            user.setCity(body.getCity());
        if (body.getProfileImageUrl() != null)
            user.setProfileImageUrl(body.getProfileImageUrl());
        if (body.getBio() != null)
            user.setBio(body.getBio());
        if (body.getInstitution() != null)
            user.setInstitution(body.getInstitution());
        if (body.getLicenseNumber() != null)
            user.setLicenseNumber(body.getLicenseNumber());
        if (body.getExpertTitle() != null)
            user.setExpertTitle(body.getExpertTitle());
        if (body.getLatitude() != null)
            user.setLatitude(body.getLatitude());
        if (body.getLongitude() != null)
            user.setLongitude(body.getLongitude());
        if (body.getAllowDirectMessages() != null) user.setAllowDirectMessages(body.getAllowDirectMessages());
        if (body.getAllowFamilyMessages() != null) user.setAllowFamilyMessages(body.getAllowFamilyMessages());
        if (body.getHideOnlineStatus() != null) user.setHideOnlineStatus(body.getHideOnlineStatus());
        if (body.getApproximateLocationOnly() != null) user.setApproximateLocationOnly(body.getApproximateLocationOnly());
        if (body.getCommunicationPreferences() != null) user.setCommunicationPreferences(body.getCommunicationPreferences());
        if (body.getSupportIntents() != null) user.setSupportIntents(body.getSupportIntents());

        user = userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success("Profil guncellendi", toUserDto(user)));
    }

    @PostMapping("/{userId}/block")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> blockUser(@PathVariable java.util.UUID userId, @CurrentUser UserPrincipal principal) {
        if (principal.getId().equals(userId)) throw new IllegalArgumentException("Kendinizi engelleyemezsiniz");
        User blocker = userRepository.findById(principal.getId()).orElseThrow();
        User blocked = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        userBlockRepository.findByBlockerIdAndBlockedId(blocker.getId(), blocked.getId())
                .orElseGet(() -> userBlockRepository.save(com.autismsupport.platform.model.UserBlock.builder().blocker(blocker).blocked(blocked).build()));
        return ResponseEntity.ok(ApiResponse.success("Kullanıcı engellendi", null));
    }

    @DeleteMapping("/{userId}/block")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> unblockUser(@PathVariable java.util.UUID userId, @CurrentUser UserPrincipal principal) {
        userBlockRepository.findByBlockerIdAndBlockedId(principal.getId(), userId).ifPresent(userBlockRepository::delete);
        return ResponseEntity.ok(ApiResponse.success("Engel kaldırıldı", null));
    }

    @GetMapping("/me/blocked")
    public ResponseEntity<ApiResponse<List<UserDto>>> blockedUsers(@CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(userBlockRepository.findByBlockerId(principal.getId()).stream()
                .map(block -> toUserDto(block.getBlocked())).toList()));
    }

    @Transactional
    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @CurrentUser UserPrincipal principal,
            @Valid @RequestBody com.autismsupport.platform.dto.ChangePasswordRequest body) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new RuntimeException("Kullanici bulunamadi"));

        if (!passwordEncoder.matches(body.getCurrentPassword(), user.getPasswordHash()))
            throw new RuntimeException("Mevcut sifre yanlis");

        user.setPasswordHash(passwordEncoder.encode(body.getNewPassword()));
        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success("Sifre degistirildi", null));
    }

    @GetMapping("/data")
    public ResponseEntity<Map<String, Object>> downloadData(@CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=verilerim.json")
                .header("Content-Type", "application/json; charset=UTF-8")
                .body(accountDataService.exportFor(principal.getId()));
    }

    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<Void>> deleteAccount(
            @CurrentUser UserPrincipal principal,
            @Valid @RequestBody com.autismsupport.platform.dto.DeleteAccountRequest request) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new RuntimeException("Kullanici bulunamadi"));
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new com.autismsupport.platform.exception.ValidationException("Mevcut şifre yanlış");
        }
        accountDeletionService.delete(user);
        return ResponseEntity.ok(ApiResponse.success("Hesap silindi", null));
    }

    @Transactional
    @PostMapping("/me/onboarding-complete")
    public ResponseEntity<ApiResponse<UserDto>> completeOnboarding(@CurrentUser UserPrincipal principal) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));
        if (!user.isOnboardingCompleted()) {
            user.setOnboardingCompleted(true);
            user = userRepository.save(user);
        }
        return ResponseEntity.ok(ApiResponse.success("Başlangıç tamamlandı", toUserDto(user)));
    }

    @PostMapping("/me/consent/ai")
    public ResponseEntity<ApiResponse<UserDto>> updateAiConsent(
            @CurrentUser UserPrincipal principal,
            @RequestParam boolean consent) {
        User user = consentService.setConsent(principal.getId(), ConsentType.AI_ANALIZ, consent, "AYARLAR");
        return ResponseEntity.ok(ApiResponse.success("Yapay zekâ rıza durumu güncellendi", toUserDto(user)));
    }

    @PostMapping("/me/consent/emergency")
    public ResponseEntity<ApiResponse<UserDto>> updateEmergencyConsent(
            @CurrentUser UserPrincipal principal,
            @RequestParam boolean consent) {
        User user = consentService.setConsent(principal.getId(), ConsentType.ACIL_DURUM_KARTI, consent, "AYARLAR");
        // Rıza geri çekildiğinde dışarıda dolaşan paylaşım bağlantıları da ölmeli.
        if (!consent) emergencyCardService.revokeAllSharesFor(user.getId());
        return ResponseEntity.ok(ApiResponse.success("Acil kart rıza durumu güncellendi", toUserDto(user)));
    }

    /** Tüm rıza türlerinin güncel durumu ve değiştirilemez geçmişi (KVKK md. 11). */
    @GetMapping("/me/consents")
    public ResponseEntity<ApiResponse<Map<String, Object>>> myConsents(@CurrentUser UserPrincipal principal) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));

        Map<String, Boolean> current = new LinkedHashMap<>();
        for (ConsentType type : ConsentType.values()) {
            current.put(type.name(), consentService.hasConsent(user.getId(), type));
        }

        List<Map<String, Object>> history = consentService.history(user.getId()).stream()
                .map(record -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("consentType", record.getConsentType().name());
                    row.put("granted", record.isGranted());
                    row.put("policyVersion", record.getPolicyVersion());
                    row.put("source", record.getSource());
                    row.put("createdAt", record.getCreatedAt());
                    return row;
                })
                .toList();

        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "current", current,
                "policyVersion", consentService.currentPolicyVersion(),
                "acceptedPolicyVersion", user.getKvkkPolicyVersion(),
                "requiresReconsent", consentService.requiresReconsent(user),
                "history", history)));
    }

    /** Genel rıza değiştirme ucu; türü isimle alır. */
    @PostMapping("/me/consents/{type}")
    public ResponseEntity<ApiResponse<UserDto>> updateConsent(
            @CurrentUser UserPrincipal principal,
            @PathVariable String type,
            @RequestParam boolean consent) {
        ConsentType consentType;
        try {
            consentType = ConsentType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ValidationException("Bilinmeyen rıza türü: " + type);
        }
        User user = consentService.setConsent(principal.getId(), consentType, consent, "AYARLAR");
        if (consentType == ConsentType.ACIL_DURUM_KARTI && !consent) {
            emergencyCardService.revokeAllSharesFor(user.getId());
        }
        return ResponseEntity.ok(ApiResponse.success("Rıza durumu güncellendi", toUserDto(user)));
    }

    /** Aydınlatma metni güncellendiğinde yeniden rıza alma. */
    @PostMapping("/me/consents/reconsent")
    public ResponseEntity<ApiResponse<UserDto>> reconsent(@CurrentUser UserPrincipal principal) {
        User user = consentService.setConsent(
                principal.getId(), ConsentType.KVKK_AYDINLATMA, true, "YENIDEN_RIZA");
        return ResponseEntity.ok(ApiResponse.success("Güncel aydınlatma metni onaylandı", toUserDto(user)));
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
                .bio(user.getBio())
                .institution(user.getInstitution())
                .licenseNumber(user.getLicenseNumber())
                .licenseVerified(user.isLicenseVerified())
                .specializations(user.getSpecializations())
                .verified(user.isVerified())
                .emailVerified(user.isEmailVerified())
                .kvkkConsent(user.isKvkkConsent())
                .consentAiAnalysis(user.isConsentAiAnalysis())
                .consentAiAnalysisDate(user.getConsentAiAnalysisDate())
                .consentEmergencyCard(user.isConsentEmergencyCard())
                .consentEmergencyCardDate(user.getConsentEmergencyCardDate())
                .isActive(user.isActive())
                .onboardingCompleted(user.isOnboardingCompleted())
                .profileImageUrl(user.getProfileImageUrl())
                .createdAt(user.getCreatedAt())
                .allowDirectMessages(user.isAllowDirectMessages())
                .allowFamilyMessages(user.isAllowFamilyMessages())
                .hideOnlineStatus(user.isHideOnlineStatus())
                .approximateLocationOnly(user.isApproximateLocationOnly())
                .communicationPreferences(user.getCommunicationPreferences())
                .supportIntents(user.getSupportIntents())
                .sessionFeeMin(user.getSessionFeeMin())
                .sessionFeeMax(user.getSessionFeeMax())
                .offersOnline(user.isOffersOnline())
                .offersFaceToFace(user.isOffersFaceToFace())
                .build();
    }
}
