package com.autismsupport.platform.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Saklama süresi politikasının uygulanması. Aydınlatma metni "veriler yasal
 * saklama süresi dolduğunda silinir" diyor; bu iş olmadan bu cümle gerçek
 * değildi. KVKK md. 7 ve Silme/Yok Etme Yönetmeliği periyodik imhayı zorunlu
 * kılar. Görev günde bir kez çalışır ve yalnızca süresi geçmiş kayıtlara
 * dokunur.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DataRetentionScheduler {

    private final JdbcTemplate jdbcTemplate;

    /** Denetim kayıtları: güvenlik incelemesi için gerekli, süresiz değil. */
    @Value("${app.retention.audit-log-days:365}")
    private int auditLogDays;

    /** Sonuçlanmış KVKK başvuruları: ispat için tutulur, sonra imha edilir. */
    @Value("${app.retention.resolved-request-days:1095}")
    private int resolvedRequestDays;

    /** Okunmuş/eski bildirimler. */
    @Value("${app.retention.notification-days:180}")
    private int notificationDays;

    /** Doğrulanmamış, hiç kullanılmamış hesaplar. */
    @Value("${app.retention.unverified-account-days:30}")
    private int unverifiedAccountDays;

    // Bilerek @Transactional değil: adımlardan biri (örn. henüz oluşmamış bir
    // tablo veya bir yabancı anahtar kısıtı) hata verdiğinde diğer adımların
    // yaptığı temizlik geri alınmamalı.
    @Scheduled(cron = "${app.retention.cron:0 30 3 * * *}")
    public void purgeExpiredData() {
        LocalDateTime now = LocalDateTime.now();

        int expiredShares = update("""
                UPDATE emergency_cards
                   SET share_enabled = false, share_token = NULL, share_expires_at = NULL
                 WHERE share_enabled = true AND share_expires_at < ?
                """, "süresi dolmuş acil kart paylaşımı", now);

        int auditLogs = update(
                "DELETE FROM audit_logs WHERE created_at < ?",
                "denetim kaydı", now.minusDays(auditLogDays));

        int resolvedRequests = update(
                "DELETE FROM data_subject_requests WHERE resolved_at IS NOT NULL AND resolved_at < ?",
                "sonuçlanmış KVKK başvurusu", now.minusDays(resolvedRequestDays));

        int notifications = update(
                "DELETE FROM notifications WHERE created_at < ?",
                "bildirim", now.minusDays(notificationDays));

        int staleTokens = update(
                "DELETE FROM refresh_tokens WHERE expires_at < ?",
                "süresi dolmuş oturum jetonu", now);

        int unverified = purgeUnverifiedAccounts(now.minusDays(unverifiedAccountDays));

        log.info("Saklama süresi temizliği tamamlandı: paylasim={} denetim={} basvuru={} bildirim={} jeton={} dogrulanmamis={}",
                expiredShares, auditLogs, resolvedRequests, notifications, staleTokens, unverified);
    }

    /**
     * E-posta doğrulaması yapılmamış hesaplar hiç giriş yapamadığı için veri
     * biriktirmez; veri minimizasyonu gereği süresi dolanlar silinir. Yine de
     * bir kayıt beklenmedik bir yabancı anahtar bağı taşıyorsa tüm partiyi
     * düşürmemesi için tek tek silinir.
     */
    private int purgeUnverifiedAccounts(LocalDateTime cutoff) {
        List<UUID> ids;
        try {
            ids = jdbcTemplate.queryForList("""
                    SELECT id FROM users
                     WHERE email_verified = false
                       AND created_at < ?
                       AND role <> 'ADMIN'
                     LIMIT 500
                    """, UUID.class, cutoff);
        } catch (DataAccessException exception) {
            log.warn("Doğrulanmamış hesap taraması atlandı: {}", exception.getMessage());
            return 0;
        }

        int deleted = 0;
        for (UUID id : ids) {
            try {
                deleted += jdbcTemplate.update("DELETE FROM users WHERE id = ?", id);
            } catch (DataAccessException exception) {
                log.warn("Doğrulanmamış hesap silinemedi (bağlı kayıt olabilir): {}", exception.getMessage());
            }
        }
        return deleted;
    }

    /**
     * Tablo henüz oluşmamışsa (taze kurulum, kısmi migration) görev tümden
     * çökmesin; o adım atlanır ve diğerleri çalışmaya devam eder.
     */
    private int update(String sql, String label, Object... args) {
        try {
            return jdbcTemplate.update(sql, args);
        } catch (DataAccessException exception) {
            log.warn("Saklama temizliği atlandı ({}): {}", label, exception.getMessage());
            return 0;
        }
    }
}
