package com.autismsupport.platform.service;

import com.autismsupport.platform.model.Child;
import com.autismsupport.platform.model.ClinicalDataShare;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.model.UserRole;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.ClinicalDataShareRepository;
import com.autismsupport.platform.repository.SharedProgressNoteRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SharedProgressService unit testleri")
class SharedProgressServiceTest {

    @Mock SharedProgressNoteRepository repository;
    @Mock ObjectMapper objectMapper;
    @Mock ChildRepository childRepository;
    @Mock ClinicalDataShareRepository shareRepository;

    @InjectMocks SharedProgressService sharedProgressService;

    private UUID childId;
    private UUID parentId;
    private UUID expertId;
    private Child child;
    private User parent;
    private User expert;

    @BeforeEach
    void setUp() {
        childId = UUID.randomUUID();
        parentId = UUID.randomUUID();
        expertId = UUID.randomUUID();

        parent = User.builder().id(parentId).email("parent@example.com").role(UserRole.PARENT).build();
        expert = User.builder().id(expertId).email("expert@example.com").role(UserRole.EXPERT).build();
        child = Child.builder().id(childId).name("Test Çocuk").parent(parent).build();
    }

    @Test
    @DisplayName("verifySharedProgressAccess: ebeveyn kendi çocuğunun verisine erişebilir")
    void verifySharedProgressAccess_parentAccess_success() {
        when(childRepository.findById(childId)).thenReturn(Optional.of(child));

        assertThatNoException().isThrownBy(() -> 
            sharedProgressService.verifySharedProgressAccess(childId, parentId)
        );

        verify(shareRepository, never()).findActiveShare(any(), any());
    }

    @Test
    @DisplayName("verifySharedProgressAccess: aktif paylaşımı olan uzman erişebilir")
    void verifySharedProgressAccess_expertWithActiveShare_success() {
        when(childRepository.findById(childId)).thenReturn(Optional.of(child));

        ClinicalDataShare share = ClinicalDataShare.builder()
                .id(UUID.randomUUID())
                .child(child)
                .parent(parent)
                .expert(expert)
                .status("ACTIVE")
                .expiresAt(LocalDateTime.now().plusDays(5))
                .build();
        when(shareRepository.findActiveShare(childId, expertId)).thenReturn(Optional.of(share));

        assertThatNoException().isThrownBy(() -> 
            sharedProgressService.verifySharedProgressAccess(childId, expertId)
        );
    }

    @Test
    @DisplayName("verifySharedProgressAccess: paylaşımı olmayan uzman erişemez")
    void verifySharedProgressAccess_expertWithoutShare_throwsAccessDenied() {
        when(childRepository.findById(childId)).thenReturn(Optional.of(child));
        when(shareRepository.findActiveShare(childId, expertId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> 
            sharedProgressService.verifySharedProgressAccess(childId, expertId)
        )
        .isInstanceOf(AccessDeniedException.class)
        .hasMessageContaining("erişim yetkiniz yok");
    }

    @Test
    @DisplayName("verifySharedProgressAccess: süresi dolmuş paylaşımı olan uzman erişemez")
    void verifySharedProgressAccess_expertWithExpiredShare_throwsAccessDenied() {
        when(childRepository.findById(childId)).thenReturn(Optional.of(child));

        ClinicalDataShare share = ClinicalDataShare.builder()
                .id(UUID.randomUUID())
                .child(child)
                .parent(parent)
                .expert(expert)
                .status("ACTIVE")
                .expiresAt(LocalDateTime.now().minusDays(1)) // Expired
                .build();
        when(shareRepository.findActiveShare(childId, expertId)).thenReturn(Optional.of(share));

        assertThatThrownBy(() -> 
            sharedProgressService.verifySharedProgressAccess(childId, expertId)
        )
        .isInstanceOf(AccessDeniedException.class)
        .hasMessageContaining("süresi dolmuş");
    }
}
