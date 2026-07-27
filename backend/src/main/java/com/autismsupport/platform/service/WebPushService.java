package com.autismsupport.platform.service;

import com.autismsupport.platform.model.PushSubscription;
import com.autismsupport.platform.repository.PushSubscriptionRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URI;
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
                HttpResponse response = pushService.send(notification);
                handleResponse(sub, response);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.warn("Push bildirimi gonderimi kesildi (endpoint: {}, hataTuru: {}).",
                        maskEndpoint(sub.getEndpoint()), e.getClass().getSimpleName());
                return;
            } catch (Exception e) {
                log.warn("Push bildirimi gonderilemedi (endpoint: {}, hataTuru: {}).",
                        maskEndpoint(sub.getEndpoint()), e.getClass().getSimpleName());
            }
        }
    }

    private void handleResponse(PushSubscription subscription, HttpResponse response) {
        String maskedEndpoint = maskEndpoint(subscription.getEndpoint());

        if (response == null || response.getStatusLine() == null) {
            log.warn("Push servisi gecersiz yanit dondurdu (endpoint: {}).", maskedEndpoint);
            return;
        }

        int statusCode = response.getStatusLine().getStatusCode();
        if (statusCode >= 200 && statusCode < 300) {
            log.debug("Push bildirimi gonderildi (endpoint: {}, status: {}).", maskedEndpoint, statusCode);
            return;
        }

        if (statusCode == 404 || statusCode == 410) {
            log.info("Suresi dolmus push aboneligi kaldiriliyor (endpoint: {}, status: {}).",
                    maskedEndpoint, statusCode);
            pushSubscriptionRepository.delete(subscription);
            return;
        }

        log.warn("Push servisi bildirimi reddetti; abonelik korunuyor (endpoint: {}, status: {}).",
                maskedEndpoint, statusCode);
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

    private String maskEndpoint(String endpoint) {
        if (endpoint == null || endpoint.isBlank()) {
            return "[masked]";
        }

        try {
            URI uri = URI.create(endpoint);
            if (uri.getScheme() == null || uri.getHost() == null) {
                return "[masked]";
            }

            String host = uri.getHost().contains(":") ? "[" + uri.getHost() + "]" : uri.getHost();
            String port = uri.getPort() >= 0 ? ":" + uri.getPort() : "";
            return uri.getScheme() + "://" + host + port + "/***";
        } catch (IllegalArgumentException e) {
            return "[masked]";
        }
    }
}
