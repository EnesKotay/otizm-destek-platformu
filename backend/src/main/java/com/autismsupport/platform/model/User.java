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
    private Boolean verified = false;

    @Column(name = "email_verified")
    @Builder.Default
    private Boolean emailVerified = false;

    @Column(name = "expert_title")
    private String expertTitle;

    @Column(name = "city")
    private String city;

    @Column(name = "institution")
    private String institution;

    @Column(name = "license_number")
    private String licenseNumber;

    @Column(name = "license_document_url")
    private String licenseDocumentUrl;

    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio;

    @Column(name = "kvkk_consent")
    @Builder.Default
    private Boolean kvkkConsent = false;

    @Column(name = "kvkk_consent_date")
    private LocalDateTime kvkkConsentDate;

    @Column(name = "consent_ai_analysis")
    @Builder.Default
    private Boolean consentAiAnalysis = false;

    @Column(name = "consent_ai_analysis_date")
    private LocalDateTime consentAiAnalysisDate;

    @Column(name = "consent_emergency_card")
    @Builder.Default
    private Boolean consentEmergencyCard = false;

    @Column(name = "consent_emergency_card_date")
    private LocalDateTime consentEmergencyCardDate;

    @Column(name = "matching_enabled")
    @Builder.Default
    private Boolean matchingEnabled = true;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "onboarding_completed")
    @Builder.Default
    private Boolean onboardingCompleted = false;

    private Double latitude;

    private Double longitude;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "specializations", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> specializations = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "age_groups", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> ageGroups = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "support_topics", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> supportTopics = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "spoken_languages", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> spokenLanguages = new ArrayList<>(List.of("Türkçe"));

    @Column(name = "session_duration_minutes")
    @Builder.Default
    private Integer sessionDurationMinutes = 50;

    @Column(name = "cancellation_policy", columnDefinition = "TEXT")
    private String cancellationPolicy;

    @Column(name = "reschedule_policy", columnDefinition = "TEXT")
    private String reschedulePolicy;

    @Column(name = "allow_direct_messages")
    @Builder.Default
    private Boolean allowDirectMessages = true;

    @Column(name = "allow_family_messages")
    @Builder.Default
    private Boolean allowFamilyMessages = true;

    @Column(name = "hide_online_status")
    @Builder.Default
    private Boolean hideOnlineStatus = false;

    @Column(name = "approximate_location_only")
    @Builder.Default
    private Boolean approximateLocationOnly = true;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "communication_preferences", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> communicationPreferences = new ArrayList<>(List.of("YAZISMA"));

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "support_intents", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> supportIntents = new ArrayList<>(List.of("DENEYIM_PAYLASIMI"));

    @Column(name = "session_fee_min", precision = 10, scale = 2)
    private java.math.BigDecimal sessionFeeMin;
    @Column(name = "session_fee_max", precision = 10, scale = 2)
    private java.math.BigDecimal sessionFeeMax;
    @Column(name = "offers_online")
    @Builder.Default
    private Boolean offersOnline = true;
    @Column(name = "offers_face_to_face")
    @Builder.Default
    private Boolean offersFaceToFace = true;

    @Column(name = "license_verified")
    @Builder.Default
    private Boolean licenseVerified = false;

    @Column(name = "accepting_patients")
    @Builder.Default
    private Boolean acceptingPatients = true;

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
    private Boolean mfaEnabled = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public boolean isVerified() { return Boolean.TRUE.equals(verified); }
    public boolean isEmailVerified() { return Boolean.TRUE.equals(emailVerified); }
    public boolean isKvkkConsent() { return Boolean.TRUE.equals(kvkkConsent); }
    public boolean isConsentAiAnalysis() { return Boolean.TRUE.equals(consentAiAnalysis); }
    public boolean isConsentEmergencyCard() { return Boolean.TRUE.equals(consentEmergencyCard); }
    public boolean isMatchingEnabled() { return !Boolean.FALSE.equals(matchingEnabled); }
    public boolean isActive() { return !Boolean.FALSE.equals(isActive); }
    public boolean isLicenseVerified() { return Boolean.TRUE.equals(licenseVerified); }
    public boolean isOnboardingCompleted() { return Boolean.TRUE.equals(onboardingCompleted); }
    public boolean isAcceptingPatients() { return !Boolean.FALSE.equals(acceptingPatients); }
    public boolean isMfaEnabled() { return Boolean.TRUE.equals(mfaEnabled); }
    public boolean isAllowDirectMessages() { return !Boolean.FALSE.equals(allowDirectMessages); }
    public boolean isAllowFamilyMessages() { return !Boolean.FALSE.equals(allowFamilyMessages); }
    public boolean isHideOnlineStatus() { return Boolean.TRUE.equals(hideOnlineStatus); }
    public boolean isApproximateLocationOnly() { return !Boolean.FALSE.equals(approximateLocationOnly); }
    public boolean isOffersOnline() { return !Boolean.FALSE.equals(offersOnline); }
    public boolean isOffersFaceToFace() { return !Boolean.FALSE.equals(offersFaceToFace); }

    public void setIsActive(boolean active) {
        this.isActive = active;
    }
}
