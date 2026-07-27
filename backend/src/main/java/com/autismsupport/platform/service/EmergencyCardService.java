package com.autismsupport.platform.service;

import com.autismsupport.platform.exception.ResourceNotFoundException;
import com.autismsupport.platform.exception.UnauthorizedException;
import com.autismsupport.platform.model.ConsentType;
import com.autismsupport.platform.model.EmergencyCard;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.EmergencyCardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Acil durum kartı çocuğun tanısını, ilaçlarını, alerjilerini ve iletişim
 * bilgilerini taşır; tamamı KVKK md. 6 anlamında özel nitelikli kişisel veridir.
 * Bu yüzden kart yalnızca (a) veli açık rıza verdiyse ve (b) veli paylaşımı
 * elle açtıysa, süreli ve tahmin edilemez bir jetonla dışarıya açılır.
 */
@Service
@RequiredArgsConstructor
public class EmergencyCardService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int DEFAULT_SHARE_HOURS = 24;
    private static final int MAX_SHARE_HOURS = 720;

    private final EmergencyCardRepository repository;
    private final ChildRepository childRepository;
    private final ConsentService consentService;

    public String getCard(UUID childId, UUID userId) {
        requireParent(childId, userId);
        return repository.findByChildIdAndUserId(childId, userId)
                .map(EmergencyCard::getData)
                .orElse(null);
    }

    /**
     * Bağlantıyı eline geçiren kişi (112 ekibi, öğretmen, akraba) için okuma.
     * Çocuk kimliğiyle değil yalnızca paylaşım jetonuyla erişilir; jetonun
     * süresi dolduğunda ya da veli paylaşımı kapattığında bağlantı ölür.
     */
    @Transactional(readOnly = true)
    public String getCardByShareToken(String shareToken) {
        if (shareToken == null || shareToken.isBlank()) {
            throw new ResourceNotFoundException("Acil durum kartı bulunamadı");
        }
        EmergencyCard card = repository.findByShareToken(shareToken)
                .orElseThrow(() -> new ResourceNotFoundException("Acil durum kartı bulunamadı"));

        boolean expired = card.getShareExpiresAt() == null
                || card.getShareExpiresAt().isBefore(LocalDateTime.now());
        boolean consentWithdrawn = !consentService.hasConsent(card.getUserId(), ConsentType.ACIL_DURUM_KARTI);

        if (!card.isShareEnabled() || expired || consentWithdrawn) {
            throw new ResourceNotFoundException("Bu paylaşım bağlantısı artık geçerli değil");
        }
        return card.getData();
    }

    @Transactional
    public void saveCard(UUID childId, UUID userId, String dataJson) {
        requireParent(childId, userId);
        EmergencyCard card = repository.findByChildIdAndUserId(childId, userId)
                .orElse(EmergencyCard.builder().childId(childId).userId(userId).build());
        card.setData(dataJson);
        repository.save(card);
    }

    /** Paylaşımın açık olup olmadığını ve mevcut bağlantıyı döner. */
    @Transactional(readOnly = true)
    public Map<String, Object> shareStatus(UUID childId, UUID userId) {
        requireParent(childId, userId);
        Map<String, Object> status = new LinkedHashMap<>();
        repository.findByChildIdAndUserId(childId, userId).ifPresentOrElse(card -> {
            boolean active = card.isShareEnabled()
                    && card.getShareExpiresAt() != null
                    && card.getShareExpiresAt().isAfter(LocalDateTime.now());
            status.put("shareEnabled", active);
            status.put("shareToken", active ? card.getShareToken() : null);
            status.put("expiresAt", active ? card.getShareExpiresAt().toString() : null);
        }, () -> {
            status.put("shareEnabled", false);
            status.put("shareToken", null);
            status.put("expiresAt", null);
        });
        status.put("consentGranted", consentService.hasConsent(userId, ConsentType.ACIL_DURUM_KARTI));
        return status;
    }

    /** Paylaşımı açar ve yeni bir jeton üretir. Açık rıza yoksa hiç başlamaz. */
    @Transactional
    public Map<String, Object> enableSharing(UUID childId, UUID userId, Integer hours) {
        requireParent(childId, userId);
        consentService.requireConsent(userId, ConsentType.ACIL_DURUM_KARTI,
                "Acil durum kartını paylaşmak için önce Ayarlar > Gizlilik ve Rızalar bölümünden "
                        + "acil durum kartı paylaşımına açık rıza vermelisiniz.");

        EmergencyCard card = repository.findByChildIdAndUserId(childId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Önce acil durum kartını doldurun"));

        int validHours = hours == null || hours < 1 || hours > MAX_SHARE_HOURS ? DEFAULT_SHARE_HOURS : hours;
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);

        card.setShareToken(Base64.getUrlEncoder().withoutPadding().encodeToString(bytes));
        card.setShareEnabled(true);
        card.setShareExpiresAt(LocalDateTime.now().plusHours(validHours));
        repository.save(card);

        return Map.of(
                "shareToken", card.getShareToken(),
                "expiresAt", card.getShareExpiresAt().toString());
    }

    /** Paylaşımı kapatır ve jetonu geçersizleştirir (rızanın geri alınması). */
    @Transactional
    public void disableSharing(UUID childId, UUID userId) {
        requireParent(childId, userId);
        repository.findByChildIdAndUserId(childId, userId).ifPresent(card -> {
            card.setShareEnabled(false);
            card.setShareToken(null);
            card.setShareExpiresAt(null);
            repository.save(card);
        });
    }

    /** Rıza geri çekildiğinde velinin tüm paylaşım bağlantılarını kapatır. */
    @Transactional
    public void revokeAllSharesFor(UUID userId) {
        repository.findAllByUserIdAndShareEnabledTrue(userId).forEach(card -> {
            card.setShareEnabled(false);
            card.setShareToken(null);
            card.setShareExpiresAt(null);
            repository.save(card);
        });
    }

    private void requireParent(UUID childId, UUID userId) {
        if (userId == null || !childRepository.existsByIdAndParentId(childId, userId)) {
            throw new UnauthorizedException("Bu çocuk profiline erişim yetkiniz yok");
        }
    }
}
