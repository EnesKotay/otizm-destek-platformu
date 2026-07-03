package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.NotificationDto;
import com.autismsupport.platform.model.Notification;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.NotificationRepository;
import com.autismsupport.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final WebPushService webPushService;
    private final FcmPushService fcmPushService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void createNotification(UUID userId, String type, String title, String body, String link) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;
        Notification notification = Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .body(body)
                .link(link)
                .build();
        Notification saved = notificationRepository.save(notification);
        webPushService.sendToUser(userId, title, body, link);
        if (isAppointmentNotification(type, link)) {
            fcmPushService.sendAppointmentNotification(userId, title, body, null);
        }
        
        try {
            messagingTemplate.convertAndSendToUser(
                userId.toString(),
                "/queue/notifications",
                toDto(saved)
            );
        } catch (Exception e) {
            // ignore exceptions related to messaging
        }
    }

    public Page<NotificationDto> getNotifications(UUID userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable).map(this::toDto);
    }

    public List<NotificationDto> getRecent(UUID userId) {
        return notificationRepository.findTop20ByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<NotificationDto> getLatest(UUID userId) {
        return getRecent(userId);
    }

    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public void markAsRead(UUID notificationId, UUID userId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getUser().getId().equals(userId)) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        });
    }

    @Transactional
    public void markAllAsRead(UUID userId) {
        notificationRepository.markAllReadByUserId(userId);
    }

    @Transactional
    public void markAllRead(UUID userId) {
        markAllAsRead(userId);
    }

    @Transactional
    public int deleteOldNotifications(java.time.LocalDateTime cutoff) {
        return notificationRepository.deleteByCreatedAtBefore(cutoff);
    }

    @Transactional
    public void deleteNotification(UUID notificationId, UUID userId) {
        notificationRepository.deleteByIdAndUserId(notificationId, userId);
    }

    @Transactional
    public void deleteNotifications(List<UUID> ids, UUID userId) {
        if (ids == null || ids.isEmpty()) return;
        notificationRepository.deleteByIdInAndUserId(ids, userId);
    }

    private boolean isAppointmentNotification(String type, String link) {
        return (type != null && type.startsWith("APPOINTMENT"))
                || "/randevular".equals(link);
    }

    private NotificationDto toDto(Notification n) {
        return NotificationDto.builder()
                .id(n.getId())
                .type(n.getType())
                .title(n.getTitle())
                .body(n.getBody())
                .link(n.getLink())
                .read(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
