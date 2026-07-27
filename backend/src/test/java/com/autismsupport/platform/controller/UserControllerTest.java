package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.UserDto;
import com.autismsupport.platform.model.ConsentType;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.UserRepository;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.ConsentService;
import com.autismsupport.platform.service.EmergencyCardService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserController unit testleri")
class UserControllerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private ConsentService consentService;

    @Mock
    private EmergencyCardService emergencyCardService;

    @InjectMocks
    private UserController userController;

    private User parentWithConsents(UUID userId, boolean ai, boolean emergency) {
        return User.builder()
                .id(userId)
                .email("test@example.com")
                .fullName("Test User")
                .role(com.autismsupport.platform.model.UserRole.PARENT)
                .consentAiAnalysis(ai)
                .consentAiAnalysisDate(ai ? LocalDateTime.now() : null)
                .consentEmergencyCard(emergency)
                .consentEmergencyCardDate(emergency ? LocalDateTime.now() : null)
                .build();
    }

    @Test
    @DisplayName("updateAiConsent: rızayı ConsentService üzerinden kaydeder")
    void updateAiConsent_updatesSuccessfully() {
        UUID userId = UUID.randomUUID();
        UserPrincipal principal = mock(UserPrincipal.class);
        when(principal.getId()).thenReturn(userId);
        when(consentService.setConsent(userId, ConsentType.AI_ANALIZ, true, "AYARLAR"))
                .thenReturn(parentWithConsents(userId, true, false));

        ResponseEntity<ApiResponse<UserDto>> response = userController.updateAiConsent(principal, true);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData().isConsentAiAnalysis()).isTrue();
        assertThat(response.getBody().getData().getConsentAiAnalysisDate()).isNotNull();
        verify(consentService).setConsent(userId, ConsentType.AI_ANALIZ, true, "AYARLAR");
    }

    @Test
    @DisplayName("updateEmergencyConsent: acil durum kartı rızasını kaydeder")
    void updateEmergencyConsent_updatesSuccessfully() {
        UUID userId = UUID.randomUUID();
        UserPrincipal principal = mock(UserPrincipal.class);
        when(principal.getId()).thenReturn(userId);
        when(consentService.setConsent(userId, ConsentType.ACIL_DURUM_KARTI, true, "AYARLAR"))
                .thenReturn(parentWithConsents(userId, false, true));

        ResponseEntity<ApiResponse<UserDto>> response = userController.updateEmergencyConsent(principal, true);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData().isConsentEmergencyCard()).isTrue();
        assertThat(response.getBody().getData().getConsentEmergencyCardDate()).isNotNull();
        verify(emergencyCardService, never()).revokeAllSharesFor(any());
    }

    @Test
    @DisplayName("updateEmergencyConsent: rıza geri alınınca açık paylaşım bağlantıları iptal edilir")
    void updateEmergencyConsent_revokesSharesOnWithdrawal() {
        UUID userId = UUID.randomUUID();
        UserPrincipal principal = mock(UserPrincipal.class);
        when(principal.getId()).thenReturn(userId);
        when(consentService.setConsent(userId, ConsentType.ACIL_DURUM_KARTI, false, "AYARLAR"))
                .thenReturn(parentWithConsents(userId, false, false));

        userController.updateEmergencyConsent(principal, false);

        verify(emergencyCardService).revokeAllSharesFor(userId);
    }
}
