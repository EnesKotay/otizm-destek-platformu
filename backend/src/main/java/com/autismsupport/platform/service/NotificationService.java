package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.NotificationDto;
import com.autismsupport.platform.model.Notification;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.NotificationRepository;
import com.autismsupport.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Platform bildirimi servisi.
 * In-app (veritabanı), WebSocket, Web Push, FCM ve e-posta kanallarını yönetir.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final WebPushService webPushService;
    private final FcmPushService fcmPushService;
    private final EmailService emailService;
    private final SimpMessagingTemplate messagingTemplate;

    // Hangi bildirim tipleri e-posta göndersin?
    // E-posta maliyetli olduğundan sadece önemli tipler için gönderiyoruz.
    private static final Set<String> EMAIL_NOTIFICATION_TYPES = Set.of(
            "APPOINTMENT_REMINDER",
            "APPOINTMENT_CONFIRMED",
            "APPOINTMENT_CANCELLED",
            "APPOINTMENT_UPDATED",
            "EXPERT_APPROVAL",
            "BUDDY_REQUEST"
    );

    @Value("${app.mail.notify-on-appointment:true}")
    private boolean notifyOnAppointment;

    @Value("${app.mail.notify-on-message:false}")
    private boolean notifyOnMessage;

    // ─────────────────────────────────────────────
    //  createNotification — tüm kanallar
    // ─────────────────────────────────────────────

    @Transactional
    public void createNotification(UUID userId, String type, String title, String body, String link) {
        createNotification(userId, type, title, body, link, null);
    }

    @Transactional
    public void createNotification(UUID userId, String type, String title, String body, String link, UUID appointmentId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;

        // 1. Veritabanına kaydet
        Notification notification = Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .body(body)
                .link(link)
                .build();
        Notification saved = notificationRepository.save(notification);

        // 2. Web Push bildirimi
        webPushService.sendToUser(userId, title, body, link);

        // 3. FCM (mobil) bildirimi — randevu türleri için
        if (isAppointmentNotification(type, link)) {
            fcmPushService.sendAppointmentNotification(userId, title, body, appointmentId);
        }

        // 4. WebSocket (gerçek zamanlı in-app)
        try {
            messagingTemplate.convertAndSendToUser(
                userId.toString(),
                "/queue/notifications",
                toDto(saved)
            );
        } catch (Exception e) {
            log.debug("WebSocket bildirimi gönderilemedi (userId={}): {}", userId, e.getMessage());
        }

        // 5. E-posta bildirimi — e-postası doğrulanmış kullanıcılara, önemli tipler için
        sendEmailIfEligible(user, type, title, body, link);
    }

    // ─────────────────────────────────────────────
    //  E-posta karar mantığı
    // ─────────────────────────────────────────────

    /**
     * Kullanıcı e-posta bildirimine uygunsa gönderir.
     * Koşullar: e-posta doğrulanmış + tip e-posta listesinde + ilgili ayar aktif.
     */
    private void sendEmailIfEligible(User user, String type, String title, String body, String link) {
        // E-postası doğrulanmamışsa gönderme
        if (!user.isEmailVerified()) {
            log.debug("E-posta bildirimi atlandı — e-posta doğrulanmamış (userId={})", user.getId());
            return;
        }

        String upperType = type != null ? type.toUpperCase() : "";

        // Randevu bildirimleri
        if (notifyOnAppointment && upperType.startsWith("APPOINTMENT")) {
            emailService.sendNotificationEmail(
                    user.getEmail(),
                    user.getFullName(),
                    type,
                    title,
                    body,
                    link
            );
            log.info("Randevu e-posta bildirimi gönderildi (userId={}, tip={})", user.getId(), type);
            return;
        }

        // Mesaj bildirimleri (opsiyonel, varsayılan kapalı)
        if (notifyOnMessage && upperType.contains("MESSAGE")) {
            emailService.sendNotificationEmail(
                    user.getEmail(),
                    user.getFullName(),
                    type,
                    title,
                    body,
                    link
            );
            log.info("Mesaj e-posta bildirimi gönderildi (userId={}, tip={})", user.getId(), type);
            return;
        }

        // Diğer önemli tipler
        if (EMAIL_NOTIFICATION_TYPES.contains(upperType)) {
            emailService.sendNotificationEmail(
                    user.getEmail(),
                    user.getFullName(),
                    type,
                    title,
                    body,
                    link
            );
            log.info("E-posta bildirimi gönderildi (userId={}, tip={})", user.getId(), type);
        }
    }

    // ─────────────────────────────────────────────
    //  CRUD metodları
    // ─────────────────────────────────────────────

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

    // ─────────────────────────────────────────────
    //  Yardımcı metodlar
    // ─────────────────────────────────────────────

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
