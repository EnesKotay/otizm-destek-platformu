package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.UserDto;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.UserRepository;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

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

        user = userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success("Profil guncellendi", toUserDto(user)));
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
    public ResponseEntity<UserDto> downloadData(@CurrentUser UserPrincipal principal) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new RuntimeException("Kullanici bulunamadi"));
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=verilerim.json")
                .header("Content-Type", "application/json; charset=UTF-8")
                .body(toUserDto(user));
    }

    @Transactional
    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<Void>> deleteAccount(@CurrentUser UserPrincipal principal) {
        userRepository.deleteById(principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Hesap silindi", null));
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
                .kvkkConsent(user.isKvkkConsent())
                .isActive(user.isActive())
                .profileImageUrl(user.getProfileImageUrl())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
