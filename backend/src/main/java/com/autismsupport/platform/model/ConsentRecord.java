package com.autismsupport.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Rıza kayıt defteri. Yalnızca satır eklenir, hiçbir zaman güncellenmez veya
 * silinmez: KVKK'da açık rızanın varlığını ispat yükü veri sorumlusundadır
 * (md. 5/1). Rıza geri çekildiğinde eski kayıt korunur, üzerine granted=false
 * olan yeni bir kayıt yazılır.
 */
@Entity
@Table(name = "consent_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConsentRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "consent_type", nullable = false, length = 64)
    private ConsentType consentType;

    @Column(nullable = false)
    private boolean granted;

    /** Rızanın hangi aydınlatma metni sürümüne verildiği. */
    @Column(name = "policy_version", nullable = false, length = 32)
    private String policyVersion;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(name = "user_agent", length = 512)
    private String userAgent;

    /** Rızanın alındığı akış: KAYIT, AYARLAR, YENIDEN_RIZA, BACKFILL. */
    @Column(length = 64)
    private String source;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
