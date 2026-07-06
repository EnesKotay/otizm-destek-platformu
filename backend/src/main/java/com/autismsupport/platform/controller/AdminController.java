package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.AdminStatsDto;
import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.AuditLogDto;
import com.autismsupport.platform.dto.MonthlyGrowthDto;
import com.autismsupport.platform.dto.PlatformSettingsDto;
import com.autismsupport.platform.dto.ReportDto;
import com.autismsupport.platform.dto.ReportTargetPreviewDto;
import com.autismsupport.platform.dto.UserDto;
import com.autismsupport.platform.dto.WeeklyQuestionDto;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.AdminService;
import com.autismsupport.platform.service.CommunityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import org.springframework.data.domain.Page;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.OperatingSystemMXBean;
import java.lang.management.RuntimeMXBean;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;
    private final com.autismsupport.platform.service.KnowledgeArticleService knowledgeArticleService;
    private final CommunityService communityService;

    @PostMapping("/weekly-questions/generate-ai")
    public ResponseEntity<ApiResponse<WeeklyQuestionDto>> generateWeeklyQuestionWithAI() {
        return ResponseEntity.ok(ApiResponse.success(
                "Yapay zeka haftanın sorusunu başarıyla üretti",
                communityService.generateWeeklyQuestionWithAI()
        ));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<AdminStatsDto>> getStats() {
        return ResponseEntity.ok(ApiResponse.success(adminService.getStats()));
    }

    @GetMapping("/analytics/growth")
    public ResponseEntity<ApiResponse<List<MonthlyGrowthDto>>> getGrowthAnalytics(
            @RequestParam(defaultValue = "30d") String period) {
        return ResponseEntity.ok(ApiResponse.success(adminService.getGrowthAnalytics(period)));
    }

    @GetMapping("/experts/pending")
    public ResponseEntity<ApiResponse<List<UserDto>>> getPendingExperts() {
        return ResponseEntity.ok(ApiResponse.success(adminService.getPendingExperts()));
    }

    @PostMapping("/experts/{expertId}/approve")
    public ResponseEntity<ApiResponse<UserDto>> approveExpert(
            @PathVariable UUID expertId,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                "Uzman onaylandi",
                adminService.approveExpert(expertId, principal.getId())
        ));
    }

    @PostMapping("/experts/{expertId}/reject")
    public ResponseEntity<ApiResponse<UserDto>> rejectExpert(
            @PathVariable UUID expertId,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                "Uzman basvurusu reddedildi",
                adminService.rejectExpert(expertId, principal.getId())
        ));
    }

    @GetMapping("/reports")
    public ResponseEntity<ApiResponse<List<ReportDto>>> getPendingReports() {
        return ResponseEntity.ok(ApiResponse.success(adminService.getPendingReports()));
    }

    @GetMapping("/reports/{reportId}/target-preview")
    public ResponseEntity<ApiResponse<ReportTargetPreviewDto>> getReportTargetPreview(@PathVariable UUID reportId) {
        return ResponseEntity.ok(ApiResponse.success(adminService.getReportTargetPreview(reportId)));
    }

    @PostMapping("/reports/{reportId}/warn")
    public ResponseEntity<ApiResponse<ReportDto>> warnReportTarget(
            @PathVariable UUID reportId,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                "Kullanici uyarildi",
                adminService.warnReportTarget(reportId, principal.getId())
        ));
    }

    @DeleteMapping("/reports/{reportId}/target")
    public ResponseEntity<ApiResponse<ReportDto>> removeReportTarget(
            @PathVariable UUID reportId,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                "Hedef icerik kaldirildi",
                adminService.removeReportTarget(reportId, principal.getId())
        ));
    }

    @GetMapping("/articles/pending")
    public ResponseEntity<ApiResponse<List<com.autismsupport.platform.dto.KnowledgeArticleDto>>> getPendingArticles() {
        return ResponseEntity.ok(ApiResponse.success(knowledgeArticleService.getPendingReviewArticles()));
    }

    @PostMapping("/articles/{articleId}/approve")
    public ResponseEntity<ApiResponse<com.autismsupport.platform.dto.KnowledgeArticleDto>> approveArticle(@PathVariable UUID articleId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Makale yayina alindi",
                knowledgeArticleService.approveExternalDraft(articleId)
        ));
    }

    @PostMapping("/articles/{articleId}/reject")
    public ResponseEntity<ApiResponse<com.autismsupport.platform.dto.KnowledgeArticleDto>> rejectArticle(@PathVariable UUID articleId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Makale taslagi reddedildi",
                knowledgeArticleService.rejectExternalDraft(articleId)
        ));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<Page<AuditLogDto>>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        return ResponseEntity.ok(ApiResponse.success(adminService.getAuditLogs(page, size, userId, action, from, to)));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<Page<UserDto>>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String query,
            @RequestParam(required = false, defaultValue = "ALL") String role) {
        return ResponseEntity.ok(ApiResponse.success(adminService.getAllUsers(page, size, query, role)));
    }

    @PostMapping("/users/{userId}/toggle-status")
    public ResponseEntity<ApiResponse<UserDto>> toggleUserStatus(
            @PathVariable UUID userId,
            @CurrentUser UserPrincipal principal) {
        UserDto updatedUser = adminService.toggleUserStatus(userId, principal.getId());
        String msg = updatedUser.isActive() ? "Kullanici engeli kaldirildi" : "Kullanici engellendi";
        return ResponseEntity.ok(ApiResponse.success(msg, updatedUser));
    }

    @PostMapping("/users/bulk-toggle-status")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> bulkToggleUserStatus(
            @Valid @RequestBody com.autismsupport.platform.dto.BulkUserStatusRequest body,
            @CurrentUser UserPrincipal principal) {
        List<UUID> userIds = body.getUserIds();
        if (userIds == null || userIds.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(Map.of("updated", 0)));
        }
        return ResponseEntity.ok(ApiResponse.success(adminService.bulkToggleUserStatus(userIds, principal.getId())));
    }

    @GetMapping("/users/export")
    public ResponseEntity<byte[]> exportUsers(
            @RequestParam(required = false, defaultValue = "ALL") String role) {
        String csv = adminService.exportUsersAsCsv(role);
        byte[] bytes = csv.getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"kullaniciler.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(bytes);
    }

    @GetMapping("/settings")
    public ResponseEntity<ApiResponse<PlatformSettingsDto>> getSettings() {
        return ResponseEntity.ok(ApiResponse.success(adminService.getPlatformSettings()));
    }

    @PutMapping("/settings")
    public ResponseEntity<ApiResponse<PlatformSettingsDto>> updateSettings(
            @RequestBody PlatformSettingsDto dto) {
        return ResponseEntity.ok(ApiResponse.success("Ayarlar kaydedildi", adminService.updatePlatformSettings(dto)));
    }

    /** Yedekleme talebini isler. Pg_dump entegre degilse yalnizca audit kaydi olusturur. */
    @PostMapping("/backup")
    public ResponseEntity<ApiResponse<Map<String, Object>>> triggerBackup(@CurrentUser UserPrincipal principal) {
        Map<String, Object> result = adminService.triggerBackup(principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Yedekleme talebi islendi.", result));
    }

    /** Platform token kullanim istatistiklerini doner. */
    @GetMapping("/token-stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTokenStats() {
        return ResponseEntity.ok(ApiResponse.success(adminService.getTokenStats()));
    }

    /** Uzmanin lisans numarasini dogrula. */
    @PostMapping("/experts/{expertId}/verify-license")
    public ResponseEntity<ApiResponse<UserDto>> verifyLicense(
            @PathVariable UUID expertId,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Lisans dogrulandi", adminService.verifyExpertLicense(expertId, principal.getId())));
    }

    /** Uzmanin lisans dogrulamasini kaldir. */
    @DeleteMapping("/experts/{expertId}/verify-license")
    public ResponseEntity<ApiResponse<UserDto>> revokeVerifyLicense(
            @PathVariable UUID expertId,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Lisans dogrulamasi kaldirildi", adminService.revokeExpertLicense(expertId, principal.getId())));
    }

    /** Gercek zamanli sunucu metrikleri (JVM + OS). */
    @GetMapping("/metrics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSystemMetrics() {
        OperatingSystemMXBean os = ManagementFactory.getOperatingSystemMXBean();
        MemoryMXBean memory = ManagementFactory.getMemoryMXBean();
        RuntimeMXBean runtime = ManagementFactory.getRuntimeMXBean();

        double cpuLoad = -1;
        long totalMemory = -1;
        long usedMemory = -1;
        if (os instanceof com.sun.management.OperatingSystemMXBean sunOs) {
            cpuLoad = Math.round(sunOs.getCpuLoad() * 1000.0) / 10.0;
            totalMemory = sunOs.getTotalMemorySize();
            usedMemory = totalMemory - sunOs.getFreeMemorySize();
        }

        long heapUsed = memory.getHeapMemoryUsage().getUsed();
        long heapMax = memory.getHeapMemoryUsage().getMax();
        long uptimeMs = runtime.getUptime();

        Map<String, Object> metrics = new HashMap<>();
        metrics.put("cpuUsage", cpuLoad >= 0 ? cpuLoad : -1);
        metrics.put("heapUsedMb", heapUsed / (1024 * 1024));
        metrics.put("heapMaxMb", heapMax / (1024 * 1024));
        metrics.put("totalMemoryMb", totalMemory > 0 ? totalMemory / (1024 * 1024) : -1);
        metrics.put("usedMemoryMb", usedMemory > 0 ? usedMemory / (1024 * 1024) : -1);
        metrics.put("uptimeMs", uptimeMs);
        metrics.put("availableProcessors", os.getAvailableProcessors());

        return ResponseEntity.ok(ApiResponse.success(metrics));
    }
}
