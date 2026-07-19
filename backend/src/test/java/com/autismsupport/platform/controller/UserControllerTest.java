package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.UserDto;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.UserRepository;
import com.autismsupport.platform.security.UserPrincipal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserController unit testleri")
class UserControllerTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserController userController;

    @Test
    @DisplayName("updateAiConsent: yapay zeka KVKK rızasını günceller")
    void updateAiConsent_updatesSuccessfully() {
        UUID userId = UUID.randomUUID();
        UserPrincipal principal = mock(UserPrincipal.class);
        when(principal.getId()).thenReturn(userId);

        User user = User.builder()
                .id(userId)
                .email("test@example.com")
                .fullName("Test User")
                .role(com.autismsupport.platform.model.UserRole.PARENT)
                .build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ResponseEntity<ApiResponse<UserDto>> response = userController.updateAiConsent(principal, true);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData().isConsentAiAnalysis()).isTrue();
        assertThat(response.getBody().getData().getConsentAiAnalysisDate()).isNotNull();
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("updateEmergencyConsent: acil durum kartı KVKK rızasını günceller")
    void updateEmergencyConsent_updatesSuccessfully() {
        UUID userId = UUID.randomUUID();
        UserPrincipal principal = mock(UserPrincipal.class);
        when(principal.getId()).thenReturn(userId);

        User user = User.builder()
                .id(userId)
                .email("test@example.com")
                .fullName("Test User")
                .role(com.autismsupport.platform.model.UserRole.PARENT)
                .build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ResponseEntity<ApiResponse<UserDto>> response = userController.updateEmergencyConsent(principal, true);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData().isConsentEmergencyCard()).isTrue();
        assertThat(response.getBody().getData().getConsentEmergencyCardDate()).isNotNull();
        verify(userRepository).save(user);
    }
}
