package com.autismsupport.platform.service;

import com.autismsupport.platform.exception.UnauthorizedException;
import com.autismsupport.platform.model.ConsentRecord;
import com.autismsupport.platform.model.ConsentType;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.ConsentRecordRepository;
import com.autismsupport.platform.repository.UserRepository;
import com.autismsupport.platform.util.ClientRequestInfo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ConsentService — rıza defteri ve zorunlu rıza kontrolü")
class ConsentServiceTest {

    @Mock ConsentRecordRepository consentRecordRepository;
    @Mock UserRepository userRepository;
    @Mock ClientRequestInfo clientRequestInfo;

    @InjectMocks ConsentService consentService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(consentService, "policyVersion", "1.1");
    }

    private User user(UUID id) {
        return User.builder().id(id).email("a@b.c").fullName("Test").build();
    }

    @Test
    @DisplayName("Rıza verildiğinde hem bayrak hem defter kaydı yazılır")
    void setConsent_writesFlagAndLedger() {
        UUID userId = UUID.randomUUID();
        User user = user(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        consentService.setConsent(userId, ConsentType.AI_ANALIZ, true, "AYARLAR");

        assertThat(user.isConsentAiAnalysis()).isTrue();
        assertThat(user.getConsentAiAnalysisDate()).isNotNull();

        ArgumentCaptor<ConsentRecord> captor = ArgumentCaptor.forClass(ConsentRecord.class);
        verify(consentRecordRepository).save(captor.capture());
        assertThat(captor.getValue().isGranted()).isTrue();
        assertThat(captor.getValue().getPolicyVersion()).isEqualTo("1.1");
        assertThat(captor.getValue().getSource()).isEqualTo("AYARLAR");
    }

    @Test
    @DisplayName("Rıza geri alındığında defterde geri alma kaydı bırakılır")
    void setConsent_withdrawalIsRecorded() {
        UUID userId = UUID.randomUUID();
        User user = user(userId);
        user.setConsentAiAnalysis(true);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        consentService.setConsent(userId, ConsentType.AI_ANALIZ, false, "AYARLAR");

        assertThat(user.isConsentAiAnalysis()).isFalse();
        assertThat(user.getConsentAiAnalysisDate()).isNull();

        ArgumentCaptor<ConsentRecord> captor = ArgumentCaptor.forClass(ConsentRecord.class);
        verify(consentRecordRepository).save(captor.capture());
        assertThat(captor.getValue().isGranted()).isFalse();
    }

    @Test
    @DisplayName("requireConsent rıza yoksa engeller")
    void requireConsent_throwsWithoutConsent() {
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user(userId)));

        assertThatThrownBy(() -> consentService.requireConsent(userId, ConsentType.AI_ANALIZ, "rıza yok"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("rıza yok");
    }

    @Test
    @DisplayName("requireConsent rıza varsa geçirir")
    void requireConsent_passesWithConsent() {
        UUID userId = UUID.randomUUID();
        User user = user(userId);
        user.setConsentAiAnalysis(true);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        consentService.requireConsent(userId, ConsentType.AI_ANALIZ, "rıza yok");
    }

    @Test
    @DisplayName("Eski metin sürümüne verilen rıza için yeniden onay istenir")
    void requiresReconsent_whenPolicyVersionChanged() {
        User user = user(UUID.randomUUID());
        user.setKvkkConsent(true);
        user.setKvkkPolicyVersion("1.0-legacy");

        assertThat(consentService.requiresReconsent(user)).isTrue();

        user.setKvkkPolicyVersion("1.1");
        assertThat(consentService.requiresReconsent(user)).isFalse();
    }
}
