package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.PushSubscriptionRequest;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.PushSubscriptionRepository;
import com.autismsupport.platform.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PushSubscriptionServiceTest {

    @Mock
    private PushSubscriptionRepository pushSubscriptionRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private PushSubscriptionService pushSubscriptionService;

    @Test
    void subscribe_usesAtomicUpsertInsteadOfReadThenSave() {
        UUID userId = UUID.randomUUID();
        PushSubscriptionRequest request = request("https://push.example/subscription");
        when(userRepository.findById(userId)).thenReturn(Optional.of(User.builder().id(userId).build()));

        pushSubscriptionService.subscribe(userId, request, "test-agent");

        verify(pushSubscriptionRepository).upsert(
                eq(userId),
                eq(request.getEndpoint()),
                eq(request.getP256dh()),
                eq(request.getAuth()),
                eq("test-agent"),
                any(LocalDateTime.class));
        verify(pushSubscriptionRepository, never()).findByEndpoint(any());
        verify(pushSubscriptionRepository, never()).save(any());
    }

    @Test
    void subscribe_concurrentCallsUseTheSameAtomicUpsertPath() throws Exception {
        UUID userId = UUID.randomUUID();
        PushSubscriptionRequest request = request("https://push.example/shared-endpoint");
        when(userRepository.findById(userId)).thenReturn(Optional.of(User.builder().id(userId).build()));

        CountDownLatch bothUpsertsStarted = new CountDownLatch(2);
        CountDownLatch allowUpsertsToFinish = new CountDownLatch(1);
        doAnswer(invocation -> {
            bothUpsertsStarted.countDown();
            if (!allowUpsertsToFinish.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Es zamanli upsert cagrilari baslatilamadi.");
            }
            return 1;
        }).when(pushSubscriptionRepository).upsert(
                eq(userId),
                eq(request.getEndpoint()),
                eq(request.getP256dh()),
                eq(request.getAuth()),
                eq("test-agent"),
                any(LocalDateTime.class));

        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<?> first = executor.submit(
                    () -> pushSubscriptionService.subscribe(userId, request, "test-agent"));
            Future<?> second = executor.submit(
                    () -> pushSubscriptionService.subscribe(userId, request, "test-agent"));

            if (!bothUpsertsStarted.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Es zamanli subscribe cagrilari upsert asamasina ulasamadi.");
            }
            allowUpsertsToFinish.countDown();
            first.get(5, TimeUnit.SECONDS);
            second.get(5, TimeUnit.SECONDS);
        } finally {
            allowUpsertsToFinish.countDown();
            executor.shutdownNow();
        }

        verify(pushSubscriptionRepository, times(2)).upsert(
                eq(userId),
                eq(request.getEndpoint()),
                eq(request.getP256dh()),
                eq(request.getAuth()),
                eq("test-agent"),
                any(LocalDateTime.class));
        verify(pushSubscriptionRepository, never()).findByEndpoint(any());
        verify(pushSubscriptionRepository, never()).save(any());
    }

    @Test
    void subscribe_rejectsMissingKeysBeforeDatabaseAccess() {
        PushSubscriptionRequest request = new PushSubscriptionRequest();
        request.setEndpoint("https://push.example/subscription");

        assertThatThrownBy(() -> pushSubscriptionService.subscribe(
                UUID.randomUUID(), request, "test-agent"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Push abonelik anahtarlari eksik.");

        verify(userRepository, never()).findById(any());
        verify(pushSubscriptionRepository, never()).upsert(any(), any(), any(), any(), any(), any());
    }

    @Test
    void subscribe_rejectsBlankKeysBeforeDatabaseAccess() {
        PushSubscriptionRequest request = request("https://push.example/subscription");
        request.setKeys(Map.of("p256dh", " ", "auth", ""));

        assertThatThrownBy(() -> pushSubscriptionService.subscribe(
                UUID.randomUUID(), request, "test-agent"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Push abonelik anahtarlari eksik.");

        verify(userRepository, never()).findById(any());
        verify(pushSubscriptionRepository, never()).upsert(any(), any(), any(), any(), any(), any());
    }

    @Test
    void subscribe_rejectsUnknownUserWithoutUpsert() {
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> pushSubscriptionService.subscribe(
                userId, request("https://push.example/subscription"), "test-agent"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Kullanici bulunamadi.");

        verify(pushSubscriptionRepository, never()).upsert(any(), any(), any(), any(), any(), any());
    }

    private PushSubscriptionRequest request(String endpoint) {
        PushSubscriptionRequest request = new PushSubscriptionRequest();
        request.setEndpoint(endpoint);
        request.setKeys(Map.of(
                "p256dh", "p256dh-key",
                "auth", "auth-key"));
        return request;
    }
}
