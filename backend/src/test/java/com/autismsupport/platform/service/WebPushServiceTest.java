package com.autismsupport.platform.service;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.autismsupport.platform.model.PushSubscription;
import com.autismsupport.platform.repository.PushSubscriptionRepository;
import nl.martijndwars.webpush.Base64Encoder;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import nl.martijndwars.webpush.Utils;
import org.apache.http.HttpVersion;
import org.apache.http.message.BasicHttpResponse;
import org.bouncycastle.jce.interfaces.ECPublicKey;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Security;
import java.security.spec.ECGenParameterSpec;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WebPushServiceTest {

    private static final String ENDPOINT =
            "https://push.example.test/send/super-secret-endpoint-token";

    @Mock
    private PushSubscriptionRepository pushSubscriptionRepository;

    @Mock
    private PushService pushService;

    private WebPushService webPushService;
    private UUID userId;
    private PushSubscription subscription;

    @BeforeAll
    static void installBouncyCastle() {
        Security.addProvider(new BouncyCastleProvider());
    }

    @BeforeEach
    void setUp() throws Exception {
        userId = UUID.randomUUID();
        subscription = validSubscription();

        webPushService = new WebPushService(pushSubscriptionRepository);
        ReflectionTestUtils.setField(webPushService, "pushService", pushService);
        ReflectionTestUtils.setField(webPushService, "enabled", true);
        when(pushSubscriptionRepository.findByUserId(userId)).thenReturn(List.of(subscription));
    }

    @ParameterizedTest
    @ValueSource(ints = {200, 201, 204, 299})
    void sendToUser_acceptsEveryTwoHundredResponseAsSuccess(int statusCode) throws Exception {
        when(pushService.send(any(Notification.class))).thenReturn(response(statusCode));

        webPushService.sendToUser(userId, "Baslik", "Govde", "/anasayfa");

        verify(pushService).send(any(Notification.class));
        verify(pushSubscriptionRepository, never()).delete(any(PushSubscription.class));
    }

    @ParameterizedTest
    @ValueSource(ints = {404, 410})
    void sendToUser_deletesOnlyExpiredSubscriptions(int statusCode) throws Exception {
        when(pushService.send(any(Notification.class))).thenReturn(response(statusCode));

        webPushService.sendToUser(userId, "Baslik", "Govde", "/anasayfa");

        verify(pushSubscriptionRepository).delete(subscription);
    }

    @ParameterizedTest
    @ValueSource(ints = {300, 400, 401, 429, 500, 503})
    void sendToUser_preservesSubscriptionForOtherNonSuccessResponses(int statusCode) throws Exception {
        when(pushService.send(any(Notification.class))).thenReturn(response(statusCode));

        webPushService.sendToUser(userId, "Baslik", "Govde", "/anasayfa");

        verify(pushSubscriptionRepository, never()).delete(any(PushSubscription.class));
    }

    @Test
    void sendToUser_preservesSubscriptionWhenSendingThrowsAndMasksSensitiveLogs() throws Exception {
        String authKey = subscription.getAuthKey();
        String publicKey = subscription.getP256dhKey();
        when(pushService.send(any(Notification.class))).thenThrow(new IOException(
                "410 expired: delivery failed for " + ENDPOINT + " using " + authKey + " and " + publicKey));

        Logger logger = (Logger) LoggerFactory.getLogger(WebPushService.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);

        try {
            webPushService.sendToUser(userId, "Baslik", "Govde", "/anasayfa");
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }

        verify(pushSubscriptionRepository, never()).delete(any(PushSubscription.class));
        String logs = appender.list.stream()
                .map(ILoggingEvent::getFormattedMessage)
                .reduce("", (left, right) -> left + "\n" + right);
        assertThat(logs)
                .contains("https://push.example.test/***")
                .contains("IOException")
                .doesNotContain(ENDPOINT)
                .doesNotContain("super-secret-endpoint-token")
                .doesNotContain("410 expired")
                .doesNotContain(authKey)
                .doesNotContain(publicKey);
    }

    @Test
    void sendToUser_preservesSubscriptionWhenResponseIsMissing() throws Exception {
        when(pushService.send(any(Notification.class))).thenReturn(null);

        webPushService.sendToUser(userId, "Baslik", "Govde", "/anasayfa");

        verify(pushSubscriptionRepository, never()).delete(any(PushSubscription.class));
    }

    private PushSubscription validSubscription() throws Exception {
        KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance("ECDH", "BC");
        keyPairGenerator.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair keyPair = keyPairGenerator.generateKeyPair();
        String publicKey = Base64Encoder.encodeUrlWithoutPadding(
                Utils.encode((ECPublicKey) keyPair.getPublic()));
        String authKey = Base64Encoder.encodeUrlWithoutPadding(new byte[16]);

        return PushSubscription.builder()
                .id(UUID.randomUUID())
                .endpoint(ENDPOINT)
                .p256dhKey(publicKey)
                .authKey(authKey)
                .build();
    }

    private BasicHttpResponse response(int statusCode) {
        return new BasicHttpResponse(HttpVersion.HTTP_1_1, statusCode, "test");
    }
}
