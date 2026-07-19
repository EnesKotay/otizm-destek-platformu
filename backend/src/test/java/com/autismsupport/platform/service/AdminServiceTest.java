package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.AdminStatsDto;
import com.autismsupport.platform.dto.MonthlyGrowthDto;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.model.UserRole;
import com.autismsupport.platform.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminService unit testleri")
class AdminServiceTest {

    @Mock PlatformSettingsService platformSettingsService;

    @Mock UserRepository userRepository;
    @Mock ForumPostRepository forumPostRepository;
    @Mock MessageRepository messageRepository;
    @Mock ReportRepository reportRepository;
    @Mock AuditLogRepository auditLogRepository;
    @Mock PlatformSettingsRepository platformSettingsRepository;
    @Mock NotificationService notificationService;
    @Mock AuditLogService auditLogService;
    @Mock EmailService emailService;

    @InjectMocks AdminService adminService;

    // ── getStats ──────────────────────────────────────────────────────────────

    @Test
    @DisplayName("getStats: repository sayım değerlerini doğru DTO'ya dönüştürür")
    void getStats_returnsCorrectCounts() {
        when(userRepository.count()).thenReturn(100L);
        when(userRepository.countByRoleAndVerifiedTrue(UserRole.EXPERT)).thenReturn(15L);
        when(userRepository.countByRoleAndVerifiedFalse(UserRole.EXPERT)).thenReturn(3L);
        when(forumPostRepository.count()).thenReturn(200L);
        when(messageRepository.count()).thenReturn(500L);
        when(userRepository.countByCreatedAtAfter(any(LocalDateTime.class))).thenReturn(10L);
        when(reportRepository.countByStatus("PENDING")).thenReturn(5L);

        AdminStatsDto stats = adminService.getStats();

        assertThat(stats.getTotalUsers()).isEqualTo(100L);
        assertThat(stats.getTotalExperts()).isEqualTo(15L);
        assertThat(stats.getPendingExperts()).isEqualTo(3L);
        assertThat(stats.getTotalPosts()).isEqualTo(200L);
        assertThat(stats.getTotalMessages()).isEqualTo(500L);
        assertThat(stats.getNewUsersThisWeek()).isEqualTo(10L);
        assertThat(stats.getPendingReports()).isEqualTo(5L);
    }

    // ── getGrowthAnalytics ────────────────────────────────────────────────────

    @Test
    @DisplayName("getGrowthAnalytics: 7d periyodu için 7 nokta döner")
    void getGrowthAnalytics_7d_returns7DataPoints() {
        when(userRepository.countByDay(any(), any())).thenReturn(List.of());

        List<MonthlyGrowthDto> result = adminService.getGrowthAnalytics("7d");

        assertThat(result).hasSize(7);
    }

    @Test
    @DisplayName("getGrowthAnalytics: sessions değeri users değerine eşit (artık uydurma formül yok)")
    void getGrowthAnalytics_sessionsEqualUsers() {
        when(userRepository.countByDay(any(), any())).thenReturn(List.of());

        List<MonthlyGrowthDto> result = adminService.getGrowthAnalytics("7d");

        result.forEach(dto -> assertThat(dto.getSessions()).isEqualTo(dto.getUsers()));
    }

    @Test
    @DisplayName("getGrowthAnalytics: null periyot 30 günlük analitik döner")
    void getGrowthAnalytics_nullPeriod_returns30Days() {
        when(userRepository.countByDay(any(), any())).thenReturn(List.of());

        List<MonthlyGrowthDto> result = adminService.getGrowthAnalytics(null);

        assertThat(result).hasSize(30);
    }

    // ── getTokenStats ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("getTokenStats: estimated flag true döner")
    void getTokenStats_estimatedFlagIsTrue() {
        when(messageRepository.count()).thenReturn(100L);
        when(forumPostRepository.count()).thenReturn(50L);

        Map<String, Object> stats = adminService.getTokenStats();

        assertThat(stats).containsKey("estimated");
        assertThat(stats.get("estimated")).isEqualTo(true);
    }

    @Test
    @DisplayName("getTokenStats: hardcoded 342910 sihirli sayısı yok")
    void getTokenStats_noMagicOffset() {
        when(messageRepository.count()).thenReturn(0L);
        when(forumPostRepository.count()).thenReturn(0L);

        Map<String, Object> stats = adminService.getTokenStats();

        assertThat((Long) stats.get("used")).isZero();
    }

    @Test
    @DisplayName("getTokenStats: remaining = budget - used")
    void getTokenStats_remainingCalculation() {
        when(messageRepository.count()).thenReturn(10L);
        when(forumPostRepository.count()).thenReturn(5L);

        Map<String, Object> stats = adminService.getTokenStats();

        long used = (Long) stats.get("used");
        long budget = (Long) stats.get("budget");
        long remaining = (Long) stats.get("remaining");
        assertThat(remaining).isEqualTo(budget - used);
    }

    // ── generateDatabaseBackup ───────────────────────────────────────────────────

    @Test
    @DisplayName("generateDatabaseBackup: admin bulunamazsa exception fırlatır")
    void generateDatabaseBackup_adminNotFound_throws() {
        UUID adminId = UUID.randomUUID();
        when(userRepository.findById(adminId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminService.generateDatabaseBackup(adminId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("bulunamadi");
    }

    // ── approveExpert ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("approveExpert: uzmanı verified=true yapar ve bildirim gönderir")
    void approveExpert_setsVerifiedAndNotifies() {
        UUID expertId = UUID.randomUUID();
        UUID adminId  = UUID.randomUUID();
        User expert = User.builder().id(expertId).email("uzman@test.com")
                .role(UserRole.EXPERT).fullName("Uzman").verified(false).build();
        User admin  = User.builder().id(adminId).role(UserRole.ADMIN).build();

        when(userRepository.findById(expertId)).thenReturn(Optional.of(expert));
        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));
        when(userRepository.save(expert)).thenReturn(expert);

        adminService.approveExpert(expertId, adminId);

        assertThat(expert.isVerified()).isTrue();
        verify(notificationService).createNotification(eq(expertId), eq("EXPERT_APPROVED"), any(), any(), any());
        verify(emailService).sendExpertApprovalEmail(expert.getEmail(), expert.getFullName());
    }

    // ── toggleUserStatus ──────────────────────────────────────────────────────

    @Test
    @DisplayName("toggleUserStatus: admin kendini banlayamaz")
    void toggleUserStatus_cannotBanSelf() {
        UUID adminId = UUID.randomUUID();
        User admin = User.builder().id(adminId).role(UserRole.ADMIN).fullName("Admin")
                .email("a@b.com").build();
        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> adminService.toggleUserStatus(adminId, adminId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("banlayamazsiniz");
    }
}
