package com.autismsupport.platform.service;

import com.autismsupport.platform.model.Child;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PatientServicePrivacyTest {
    @Mock AppointmentRepository appointmentRepository;
    @Mock ExpertTaskRepository expertTaskRepository;
    @Mock ChildRepository childRepository;
    @Mock UserRepository userRepository;
    @Mock NotificationService notificationService;
    @Mock AuditLogService auditLogService;
    @Mock ExpertPatientConnectionRepository expertPatientConnectionRepository;
    @InjectMocks PatientService service;

    @Test
    void hiddenParentProfileCannotBeOpenedByExpert() {
        UUID childId = UUID.randomUUID();
        User parent = User.builder().id(UUID.randomUUID()).profileVisibleToExperts(false).build();
        Child child = Child.builder().id(childId).parent(parent).build();
        when(childRepository.findById(childId)).thenReturn(Optional.of(child));

        assertThatThrownBy(() -> service.getTasks(UUID.randomUUID(), childId))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("görünürlüğünü");
    }
}
