package com.autismsupport.platform.service;

import com.autismsupport.platform.model.DeviceToken;
import com.autismsupport.platform.repository.DeviceTokenRepository;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.BatchResponse;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.MessagingErrorCode;
import com.google.firebase.messaging.MulticastMessage;
import com.google.firebase.messaging.SendResponse;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FcmPushService {
    private static final String APP_NAME = "mobile-fcm";
    private static final int FCM_MULTICAST_LIMIT = 500;

    private final DeviceTokenRepository deviceTokenRepository;

    @Value("${app.firebase.enabled:true}")
    private boolean firebaseEnabled;

    @Value("${app.firebase.service-account-json:}")
    private String serviceAccountJson;

    @Value("${app.firebase.service-account-json-base64:}")
    private String serviceAccountJsonBase64;

    @Value("${app.firebase.service-account-path:}")
    private String serviceAccountPath;

    private FirebaseMessaging firebaseMessaging;
    private boolean enabled = false;

    @PostConstruct
    public void init() {
        if (!firebaseEnabled) {
            log.info("Firebase FCM devre disi.");
            return;
        }

        if (isBlank(serviceAccountJson) && isBlank(serviceAccountJsonBase64) && isBlank(serviceAccountPath)) {
            log.info("Firebase service account tanimli degil; mobil FCM devre disi.");
            return;
        }

        try (InputStream credentialsStream = credentialsStream()) {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(credentialsStream))
                    .build();

            FirebaseApp app = FirebaseApp.getApps().stream()
                    .filter(existing -> APP_NAME.equals(existing.getName()))
                    .findFirst()
                    .orElseGet(() -> FirebaseApp.initializeApp(options, APP_NAME));
            firebaseMessaging = FirebaseMessaging.getInstance(app);
            enabled = true;
            log.info("Firebase FCM servisi aktif.");
        } catch (Exception e) {
            log.warn("Firebase FCM servisi baslatilamadi: {}", e.getMessage());
        }
    }

    @Async
    public void sendMessageNotification(UUID userId, String title, String body, UUID conversationId, String conversationTitle) {
        Map<String, String> data = new HashMap<>();
        data.put("type", "MESSAGE");
        data.put("conversationId", stringValue(conversationId));
        data.put("conversationTitle", stringValue(conversationTitle));
        sendToUser(userId, title, body, data);
    }

    @Async
    public void sendAppointmentNotification(UUID userId, String title, String body, UUID appointmentId) {
        Map<String, String> data = new HashMap<>();
        data.put("type", "APPOINTMENT");
        if (appointmentId != null) {
            data.put("appointmentId", appointmentId.toString());
        }
        sendToUser(userId, title, body, data);
    }

    public void sendToUser(UUID userId, String title, String body, Map<String, String> data) {
        if (!enabled) return;

        List<DeviceToken> deviceTokens = deviceTokenRepository.findByUserId(userId);
        if (deviceTokens.isEmpty()) return;

        List<String> tokens = deviceTokens.stream()
                .map(DeviceToken::getToken)
                .filter(token -> !isBlank(token))
                .distinct()
                .toList();
        if (tokens.isEmpty()) return;

        Map<String, String> safeData = sanitizeData(data);
        for (int start = 0; start < tokens.size(); start += FCM_MULTICAST_LIMIT) {
            int end = Math.min(start + FCM_MULTICAST_LIMIT, tokens.size());
            sendBatch(tokens.subList(start, end), title, body, safeData);
        }
    }

    private void sendBatch(List<String> tokens, String title, String body, Map<String, String> data) {
        MulticastMessage message = MulticastMessage.builder()
                .setNotification(com.google.firebase.messaging.Notification.builder()
                        .setTitle(stringValue(title))
                        .setBody(stringValue(body))
                        .build())
                .putAllData(data)
                .addAllTokens(tokens)
                .build();

        try {
            BatchResponse response = firebaseMessaging.sendEachForMulticast(message);
            List<String> invalidTokens = invalidTokens(tokens, response.getResponses());
            if (!invalidTokens.isEmpty()) {
                deviceTokenRepository.deleteByTokenIn(invalidTokens);
            }
        } catch (FirebaseMessagingException e) {
            log.warn("FCM bildirimi gonderilemedi: {}", e.getMessage());
        }
    }

    private List<String> invalidTokens(List<String> tokens, List<SendResponse> responses) {
        List<String> invalidTokens = new ArrayList<>();
        for (int i = 0; i < responses.size(); i++) {
            SendResponse response = responses.get(i);
            if (response.isSuccessful() || response.getException() == null) {
                continue;
            }
            MessagingErrorCode errorCode = response.getException().getMessagingErrorCode();
            if (errorCode == MessagingErrorCode.UNREGISTERED || errorCode == MessagingErrorCode.INVALID_ARGUMENT) {
                invalidTokens.add(tokens.get(i));
            } else {
                log.warn("FCM token icin gonderim basarisiz: {}", response.getException().getMessage());
            }
        }
        return invalidTokens;
    }

    private Map<String, String> sanitizeData(Map<String, String> data) {
        Map<String, String> safeData = new HashMap<>();
        if (data == null) return safeData;
        data.forEach((key, value) -> {
            if (!isBlank(key)) {
                safeData.put(key, stringValue(value));
            }
        });
        return safeData;
    }

    private InputStream credentialsStream() {
        if (!isBlank(serviceAccountJsonBase64)) {
            return new ByteArrayInputStream(Base64.getDecoder().decode(serviceAccountJsonBase64.trim()));
        }
        if (!isBlank(serviceAccountJson)) {
            return new ByteArrayInputStream(serviceAccountJson.trim().getBytes(StandardCharsets.UTF_8));
        }
        try {
            return new FileInputStream(serviceAccountPath.trim());
        } catch (Exception e) {
            throw new IllegalStateException("Firebase service account path okunamadi", e);
        }
    }

    private String stringValue(Object value) {
        return value == null ? "" : value.toString();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
