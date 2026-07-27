package com.autismsupport.platform.service;

import com.autismsupport.platform.exception.ResourceNotFoundException;
import com.autismsupport.platform.exception.UnauthorizedException;
import com.autismsupport.platform.model.ConsentType;
import com.autismsupport.platform.model.EmergencyCard;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.EmergencyCardRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("EmergencyCardService — acil durum kartı erişim kuralları")
class EmergencyCardServiceTest {

    @Mock EmergencyCardRepository repository;
    @Mock ChildRepository childRepository;
    @Mock ConsentService consentService;

    @InjectMocks EmergencyCardService service;

    private EmergencyCard card(UUID childId, UUID ownerId, boolean shareEnabled, LocalDateTime expiresAt) {
        return EmergencyCard.builder()
                .id(UUID.randomUUID())
                .childId(childId)
                .userId(ownerId)
                .data("{\"childName\":\"Test\"}")
                .shareEnabled(shareEnabled)
                .shareToken("jeton")
                .shareExpiresAt(expiresAt)
                .build();
    }

    @Test
    @DisplayName("Başkasının çocuğunun kartı okunamaz")
    void getCard_rejectsNonParent() {
        UUID childId = UUID.randomUUID();
        UUID strangerId = UUID.randomUUID();
        when(childRepository.existsByIdAndParentId(childId, strangerId)).thenReturn(false);

        assertThatThrownBy(() -> service.getCard(childId, strangerId))
                .isInstanceOf(UnauthorizedException.class);
        verify(repository, never()).findByChildIdAndUserId(any(), any());
    }

    @Test
    @DisplayName("Geçerli jetonla kart okunur")
    void getCardByShareToken_returnsDataWhenValid() {
        UUID childId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        when(repository.findByShareToken("jeton"))
                .thenReturn(Optional.of(card(childId, ownerId, true, LocalDateTime.now().plusHours(1))));
        when(consentService.hasConsent(ownerId, ConsentType.ACIL_DURUM_KARTI)).thenReturn(true);

        assertThat(service.getCardByShareToken("jeton")).contains("childName");
    }

    @Test
    @DisplayName("Süresi dolmuş jeton reddedilir")
    void getCardByShareToken_rejectsExpiredToken() {
        UUID ownerId = UUID.randomUUID();
        when(repository.findByShareToken("jeton"))
                .thenReturn(Optional.of(card(UUID.randomUUID(), ownerId, true, LocalDateTime.now().minusMinutes(1))));

        assertThatThrownBy(() -> service.getCardByShareToken("jeton"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Rıza geri alınmışsa geçerli jeton bile kartı açmaz")
    void getCardByShareToken_rejectsWhenConsentWithdrawn() {
        UUID ownerId = UUID.randomUUID();
        when(repository.findByShareToken("jeton"))
                .thenReturn(Optional.of(card(UUID.randomUUID(), ownerId, true, LocalDateTime.now().plusHours(1))));
        when(consentService.hasConsent(ownerId, ConsentType.ACIL_DURUM_KARTI)).thenReturn(false);

        assertThatThrownBy(() -> service.getCardByShareToken("jeton"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Bilinmeyen jeton reddedilir")
    void getCardByShareToken_rejectsUnknownToken() {
        when(repository.findByShareToken("yok")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getCardByShareToken("yok"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Rıza yoksa paylaşım açılamaz")
    void enableSharing_requiresConsent() {
        UUID childId = UUID.randomUUID();
        UUID parentId = UUID.randomUUID();
        when(childRepository.existsByIdAndParentId(childId, parentId)).thenReturn(true);
        doThrow(new UnauthorizedException("rıza yok"))
                .when(consentService).requireConsent(eq(parentId), eq(ConsentType.ACIL_DURUM_KARTI), anyString());

        assertThatThrownBy(() -> service.enableSharing(childId, parentId, 24))
                .isInstanceOf(UnauthorizedException.class);
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("Paylaşım açılınca tahmin edilemez jeton ve son kullanma tarihi üretilir")
    void enableSharing_generatesTokenAndExpiry() {
        UUID childId = UUID.randomUUID();
        UUID parentId = UUID.randomUUID();
        EmergencyCard existing = card(childId, parentId, false, null);
        existing.setShareToken(null);

        when(childRepository.existsByIdAndParentId(childId, parentId)).thenReturn(true);
        when(repository.findByChildIdAndUserId(childId, parentId)).thenReturn(Optional.of(existing));
        when(repository.save(any(EmergencyCard.class))).thenAnswer(i -> i.getArgument(0));

        var result = service.enableSharing(childId, parentId, 48);

        assertThat(existing.isShareEnabled()).isTrue();
        assertThat(existing.getShareToken()).isNotNull().hasSizeGreaterThan(30);
        assertThat(existing.getShareExpiresAt()).isAfter(LocalDateTime.now().plusHours(47));
        assertThat(result).containsKey("shareToken");
    }

    @Test
    @DisplayName("Paylaşım kapatılınca jeton silinir")
    void disableSharing_clearsToken() {
        UUID childId = UUID.randomUUID();
        UUID parentId = UUID.randomUUID();
        EmergencyCard existing = card(childId, parentId, true, LocalDateTime.now().plusHours(5));

        when(childRepository.existsByIdAndParentId(childId, parentId)).thenReturn(true);
        when(repository.findByChildIdAndUserId(childId, parentId)).thenReturn(Optional.of(existing));

        service.disableSharing(childId, parentId);

        assertThat(existing.isShareEnabled()).isFalse();
        assertThat(existing.getShareToken()).isNull();
        assertThat(existing.getShareExpiresAt()).isNull();
    }
}
