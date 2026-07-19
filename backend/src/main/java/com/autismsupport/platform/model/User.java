package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private UserRole role = UserRole.PARENT;

    @Column(name = "is_verified")
    @Builder.Default
    private boolean verified = false;

    @Column(name = "email_verified", nullable = false)
    @Builder.Default
    private boolean emailVerified = false;

    @Column(name = "expert_title")
    private String expertTitle;

    @Column(name = "city")
    private String city;

    @Column(name = "institution")
    private String institution;

    @Column(name = "license_number")
    private String licenseNumber;

    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio;

    @Column(name = "kvkk_consent")
    @Builder.Default
    private boolean kvkkConsent = false;

    @Column(name = "kvkk_consent_date")
    private LocalDateTime kvkkConsentDate;

    @Column(name = "consent_ai_analysis")
    @Builder.Default
    private boolean consentAiAnalysis = false;

    @Column(name = "consent_ai_analysis_date")
    private LocalDateTime consentAiAnalysisDate;

    @Column(name = "consent_emergency_card")
    @Builder.Default
    private boolean consentEmergencyCard = false;

    @Column(name = "consent_emergency_card_date")
    private LocalDateTime consentEmergencyCardDate;

    @Column(name = "matching_enabled")
    @Builder.Default
    private boolean matchingEnabled = true;

    @Column(name = "is_active")
    @Builder.Default
    private boolean isActive = true;

    private Double latitude;

    private Double longitude;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "specializations", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> specializations = new ArrayList<>();

    @Column(name = "license_verified")
    @Builder.Default
    private boolean licenseVerified = false;

    @Column(name = "accepting_patients")
    @Builder.Default
    private boolean acceptingPatients = true;

    @Column(name = "license_verified_at")
    private LocalDateTime licenseVerifiedAt;

    @Column(name = "profile_image_url")
    private String profileImageUrl;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Child> children = new ArrayList<>();

    @OneToMany(mappedBy = "expert", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ExpertPatientConnection> expertConnections = new ArrayList<>();

    @OneToMany(mappedBy = "expert", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ExpertTask> assignedTasks = new ArrayList<>();

    @OneToMany(mappedBy = "expert", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Appointment> expertAppointments = new ArrayList<>();

    @Column(name = "mfa_secret")
    private String mfaSecret;

    @Column(name = "mfa_enabled")
    @Builder.Default
    private boolean mfaEnabled = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public boolean isActive() {
        return isActive;
    }

    public void setIsActive(boolean active) {
        isActive = active;
    }
}
