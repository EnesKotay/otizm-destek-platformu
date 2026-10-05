package com.autismsupport.platform.service;

import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.NotificationRepository;
import com.autismsupport.platform.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {
    @Mock NotificationRepository notificationRepository;
    @Mock UserRepository userRepository;
    @Mock WebPushService webPushService;
    @Mock FcmPushService fcmPushService;
    @Mock EmailService emailService;
    @Mock SimpMessagingTemplate messagingTemplate;
    @InjectMocks NotificationService service;

    @Test
    void disabledPreferenceStopsEveryDeliveryChannel() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().id(userId).notificationPreferences(List.of()).build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        service.createNotification(userId, "APPOINTMENT_REMINDER", "Hatırlatma", "Yarın", "/randevular");

        verifyNoInteractions(notificationRepository, webPushService, fcmPushService, emailService, messagingTemplate);
    }

    @Test
    void appointmentEmailSettingCannotBeBypassedByImportantTypeFallback() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("parent@example.com")
                .fullName("Parent")
                .emailVerified(true)
                .notificationPreferences(List.of("notif_appt_confirm"))
                .build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(notificationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        ReflectionTestUtils.setField(service, "notifyOnAppointment", false);

        service.createNotification(userId, "APPOINTMENT_CONFIRMED", "Onaylandı", "Randevu", "/randevular");

        verifyNoInteractions(emailService);
    }
}
