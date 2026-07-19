package com.autismsupport.platform.service;

import com.autismsupport.platform.exception.ValidationException;
import com.autismsupport.platform.model.PlatformSettings;
import com.autismsupport.platform.repository.PlatformSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class PlatformSettingsService {
    private static final Duration CACHE_TTL = Duration.ofSeconds(5);
    private final PlatformSettingsRepository repository;
    private volatile PlatformSettings cached;
    private volatile Instant cachedAt = Instant.EPOCH;

    @Transactional
    public PlatformSettings current() {
        PlatformSettings local = cached;
        if (local != null && cachedAt.plus(CACHE_TTL).isAfter(Instant.now())) return local;
        synchronized (this) {
            if (cached == null || cachedAt.plus(CACHE_TTL).isBefore(Instant.now())) {
                cached = repository.findById("global")
                        .orElseGet(() -> repository.save(PlatformSettings.builder().id("global").build()));
                cachedAt = Instant.now();
            }
            return cached;
        }
    }

    public void requireRegistrationsOpen() {
        if (!current().isRegistrationsOpen()) {
            throw new ValidationException("Yeni kullanıcı kayıtları geçici olarak kapalıdır");
        }
    }

    public void requireAiEnabled() {
        if (!current().isAiEnabled()) {
            throw new ValidationException("Yapay zeka özellikleri yönetici tarafından devre dışı bırakıldı");
        }
    }

    public boolean isMaintenanceMode() {
        return current().isMaintenanceMode();
    }

    public void invalidate() {
        cached = null;
        cachedAt = Instant.EPOCH;
    }
}
