package com.autismsupport.platform.service;

import com.autismsupport.platform.model.PushSubscription;
import com.autismsupport.platform.repository.PushSubscriptionRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.security.Security;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebPushService {

    private final PushSubscriptionRepository pushSubscriptionRepository;

    @Value("${app.push.vapid-public-key:}")
    private String vapidPublicKey;

    @Value("${app.push.vapid-private-key:}")
    private String vapidPrivateKey;

    @Value("${app.push.vapid-subject:mailto:admin@otizmdestek.com}")
    private String vapidSubject;

    private PushService pushService;
    private boolean enabled = false;

    @PostConstruct
    public void init() {
        Security.addProvider(new BouncyCastleProvider());
        if (vapidPublicKey != null && !vapidPublicKey.isBlank()
                && vapidPrivateKey != null && !vapidPrivateKey.isBlank()) {
            try {
                pushService = new PushService(vapidPublicKey, vapidPrivateKey, vapidSubject);
                enabled = true;
                log.info("Web Push servisi aktif.");
            } catch (Exception e) {
                log.warn("Web Push servisi başlatılamadı (VAPID anahtarları geçersiz): {}", e.getMessage());
            }
        } else {
            log.info("VAPID anahtarları tanımlanmamış — Web Push devre dışı.");
        }
    }

    @Async
    public void sendToUser(UUID userId, String title, String body, String link) {
        if (!enabled) return;

        List<PushSubscription> subscriptions = pushSubscriptionRepository.findByUserId(userId);
        if (subscriptions.isEmpty()) return;

        String payload = buildPayload(title, body, link);

        for (PushSubscription sub : subscriptions) {
            try {
                Notification notification = new Notification(
                        sub.getEndpoint(),
                        sub.getP256dhKey(),
                        sub.getAuthKey(),
                        payload.getBytes()
                );
                pushService.send(notification);
            } catch (Exception e) {
                log.warn("Push bildirimi gönderilemedi (endpoint: {}): {}", sub.getEndpoint(), e.getMessage());
                // Geçersiz/süresi dolmuş subscription'ı kaldır
                if (isExpiredSubscription(e)) {
                    pushSubscriptionRepository.delete(sub);
                }
            }
        }
    }

    private String buildPayload(String title, String body, String link) {
        String safeTitle = escapeJson(title);
        String safeBody  = escapeJson(body);
        String safeLink  = link != null ? escapeJson(link) : "";
        return "{\"title\":\"" + safeTitle + "\",\"body\":\"" + safeBody + "\",\"link\":\"" + safeLink + "\"}";
    }

    private String escapeJson(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }

    private boolean isExpiredSubscription(Exception e) {
        String msg = e.getMessage();
        return msg != null && (msg.contains("410") || msg.contains("404") || msg.contains("expired"));
    }
}
