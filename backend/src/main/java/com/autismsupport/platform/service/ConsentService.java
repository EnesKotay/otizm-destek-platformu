package com.autismsupport.platform.service;

import com.autismsupport.platform.exception.ResourceNotFoundException;
import com.autismsupport.platform.exception.UnauthorizedException;
import com.autismsupport.platform.model.ConsentRecord;
import com.autismsupport.platform.model.ConsentType;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.ConsentRecordRepository;
import com.autismsupport.platform.repository.UserRepository;
import com.autismsupport.platform.util.ClientRequestInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Rızaların tek giriş noktası. Her değişiklik hem kullanıcı üzerindeki hızlı
 * okunan bayrağa hem de değiştirilemez rıza defterine yazılır.
 */
@Service
@RequiredArgsConstructor
public class ConsentService {

    private final ConsentRecordRepository consentRecordRepository;
    private final UserRepository userRepository;
    private final ClientRequestInfo clientRequestInfo;

    /** Yürürlükteki aydınlatma metni sürümü; metin değişince artırılır. */
    @Value("${app.legal.policy-version:1.1}")
    private String policyVersion;

    public String currentPolicyVersion() {
        return policyVersion;
    }

    @Transactional
    public User setConsent(UUID userId, ConsentType type, boolean granted, String source) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));
        return setConsent(user, type, granted, source);
    }

    @Transactional
    public User setConsent(User user, ConsentType type, boolean granted, String source) {
        LocalDateTime now = LocalDateTime.now();
        switch (type) {
            case KVKK_AYDINLATMA -> {
                user.setKvkkConsent(granted);
                user.setKvkkConsentDate(granted ? now : null);
                user.setKvkkPolicyVersion(granted ? policyVersion : null);
            }
            case AI_ANALIZ -> {
                user.setConsentAiAnalysis(granted);
                user.setConsentAiAnalysisDate(granted ? now : null);
            }
            case ACIL_DURUM_KARTI -> {
                user.setConsentEmergencyCard(granted);
                user.setConsentEmergencyCardDate(granted ? now : null);
            }
            case ESLESTIRME -> user.setMatchingEnabled(granted);
            case PAZARLAMA_ILETISIMI -> { /* defterde tutulur, ayrı bayrağı yok */ }
        }
        User saved = userRepository.save(user);
        record(saved.getId(), type, granted, source);
        return saved;
    }

    /**
     * Rıza bayrağını değiştirmeden yalnızca deftere yazar. Kayıt akışı gibi
     * kullanıcının aynı istekte oluşturulduğu yerlerde kullanılır.
     */
    @Transactional
    public void record(UUID userId, ConsentType type, boolean granted, String source) {
        consentRecordRepository.save(ConsentRecord.builder()
                .userId(userId)
                .consentType(type)
                .granted(granted)
                .policyVersion(policyVersion)
                .ipAddress(clientRequestInfo.clientIp())
                .userAgent(clientRequestInfo.userAgent())
                .source(source)
                .build());
    }

    @Transactional(readOnly = true)
    public boolean hasConsent(UUID userId, ConsentType type) {
        return userRepository.findById(userId).map(user -> switch (type) {
            case KVKK_AYDINLATMA -> user.isKvkkConsent();
            case AI_ANALIZ -> user.isConsentAiAnalysis();
            case ACIL_DURUM_KARTI -> user.isConsentEmergencyCard();
            case ESLESTIRME -> user.isMatchingEnabled();
            case PAZARLAMA_ILETISIMI -> consentRecordRepository
                    .findFirstByUserIdAndConsentTypeOrderByCreatedAtDesc(userId, type)
                    .map(ConsentRecord::isGranted)
                    .orElse(false);
        }).orElse(false);
    }

    /**
     * Açık rıza gerektiren bir işlemden önce çağrılır. Rıza yoksa işlem hiç
     * başlamaz; özel nitelikli veri hiçbir yere aktarılmaz.
     */
    @Transactional(readOnly = true)
    public void requireConsent(UUID userId, ConsentType type, String message) {
        if (!hasConsent(userId, type)) {
            throw new UnauthorizedException(message);
        }
    }

    @Transactional(readOnly = true)
    public List<ConsentRecord> history(UUID userId) {
        return consentRecordRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Kullanıcının rıza verdiği metin sürümü güncel mi? Değilse arayüz yeniden
     * aydınlatma/rıza akışı gösterir (KVKK md. 10 aydınlatma yükümlülüğü).
     */
    @Transactional(readOnly = true)
    public boolean requiresReconsent(User user) {
        return !user.isKvkkConsent() || !policyVersion.equals(user.getKvkkPolicyVersion());
    }
}
