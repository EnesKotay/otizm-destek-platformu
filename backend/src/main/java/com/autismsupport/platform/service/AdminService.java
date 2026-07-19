package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.AdminStatsDto;
import com.autismsupport.platform.dto.AuditLogDto;
import com.autismsupport.platform.dto.MonthlyGrowthDto;
import com.autismsupport.platform.dto.PlatformSettingsDto;
import com.autismsupport.platform.dto.ReportDto;
import com.autismsupport.platform.dto.ReportTargetPreviewDto;
import com.autismsupport.platform.dto.UserActivitySummaryDto;
import com.autismsupport.platform.dto.UserDto;
import com.autismsupport.platform.exception.ValidationException;
import com.autismsupport.platform.model.AuditLog;
import com.autismsupport.platform.model.ForumComment;
import com.autismsupport.platform.model.ForumPost;
import com.autismsupport.platform.model.Message;
import com.autismsupport.platform.model.PlatformSettings;
import com.autismsupport.platform.model.Report;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.model.UserRole;
import com.autismsupport.platform.repository.AppointmentRepository;
import com.autismsupport.platform.repository.AuditLogRepository;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.ForumCommentRepository;
import com.autismsupport.platform.repository.MessageRepository;
import com.autismsupport.platform.repository.PlatformSettingsRepository;
import com.autismsupport.platform.repository.ReportRepository;
import com.autismsupport.platform.repository.UserRepository;
import com.autismsupport.platform.repository.ForumPostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final UserRepository userRepository;
    private final ForumPostRepository forumPostRepository;
    private final ForumCommentRepository forumCommentRepository;
    private final MessageRepository messageRepository;
    private final ReportRepository reportRepository;
    private final AuditLogRepository auditLogRepository;
    private final PlatformSettingsRepository platformSettingsRepository;
    private final PlatformSettingsService platformSettingsService;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final EmailService emailService;
    private final ChildRepository childRepository;
    private final AppointmentRepository appointmentRepository;

    @Value("${spring.datasource.url}")
    private String datasourceUrl;

    @Value("${spring.datasource.username}")
    private String datasourceUsername;

    @Value("${spring.datasource.password}")
    private String datasourcePassword;

    public AdminStatsDto getStats() {
        return AdminStatsDto.builder()
                .totalUsers(userRepository.count())
                .totalExperts(userRepository.countByRoleAndVerifiedTrue(UserRole.EXPERT))
                .pendingExperts(userRepository.countByRoleAndVerifiedFalse(UserRole.EXPERT))
                .totalPosts(forumPostRepository.count())
                .totalMessages(messageRepository.count())
                .newUsersThisWeek(userRepository.countByCreatedAtAfter(LocalDateTime.now().minusDays(7)))
                .pendingReports(reportRepository.countByStatus("PENDING"))
                .build();
    }

    public List<MonthlyGrowthDto> getGrowthAnalytics(String period) {
        if (period == null) period = "30d";
        Locale tr = Locale.of("tr");
        LocalDateTime now = LocalDateTime.now();

        return switch (period) {
            case "7d" -> buildDailyAnalytics(now.minusDays(7), now, 7,
                    DateTimeFormatter.ofPattern("d MMM", tr), tr);
            case "90d" -> buildWeeklyAnalytics(now.minusWeeks(13), now, 13,
                    DateTimeFormatter.ofPattern("d MMM", tr), tr);
            case "1y" -> buildMonthlyAnalytics(now.minusMonths(12), now, 12, tr);
            default -> buildDailyAnalytics(now.minusDays(30), now, 30,
                    DateTimeFormatter.ofPattern("d MMM", tr), tr);
        };
    }

    private List<MonthlyGrowthDto> buildDailyAnalytics(LocalDateTime from, LocalDateTime to,
                                                        int days, DateTimeFormatter fmt, Locale tr) {
        List<Object[]> rows = userRepository.countByDay(from, to);
        Map<LocalDate, Long> countsByDay = rows.stream().collect(
                Collectors.toMap(
                        r -> ((java.sql.Timestamp) r[0]).toLocalDateTime().toLocalDate(),
                        r -> ((Number) r[1]).longValue()
                ));
        List<MonthlyGrowthDto> result = new ArrayList<>();
        LocalDate today = to.toLocalDate();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            long count = countsByDay.getOrDefault(day, 0L);
            result.add(MonthlyGrowthDto.builder().name(day.format(fmt)).users(count).sessions(count).build());
        }
        return result;
    }

    private List<MonthlyGrowthDto> buildWeeklyAnalytics(LocalDateTime from, LocalDateTime to,
                                                         int weeks, DateTimeFormatter fmt, Locale tr) {
        List<Object[]> rows = userRepository.countByWeek(from, to);
        Map<LocalDate, Long> countsByWeek = rows.stream().collect(
                Collectors.toMap(
                        r -> ((java.sql.Timestamp) r[0]).toLocalDateTime().toLocalDate(),
                        r -> ((Number) r[1]).longValue()
                ));
        List<MonthlyGrowthDto> result = new ArrayList<>();
        LocalDate today = to.toLocalDate();
        for (int i = weeks; i >= 0; i--) {
            LocalDate weekStart = today.minusWeeks(i).with(java.time.DayOfWeek.MONDAY);
            long count = countsByWeek.getOrDefault(weekStart, 0L);
            result.add(MonthlyGrowthDto.builder().name(weekStart.format(fmt)).users(count).sessions(count).build());
        }
        return result;
    }

    private List<MonthlyGrowthDto> buildMonthlyAnalytics(LocalDateTime from, LocalDateTime to,
                                                          int months, Locale tr) {
        List<Object[]> rows = userRepository.countByMonth(from, to);
        Map<YearMonth, Long> countsByMonth = rows.stream().collect(
                Collectors.toMap(
                        r -> YearMonth.from(((java.sql.Timestamp) r[0]).toLocalDateTime()),
                        r -> ((Number) r[1]).longValue()
                ));
        List<MonthlyGrowthDto> result = new ArrayList<>();
        YearMonth current = YearMonth.from(from).plusMonths(1);
        for (int i = 0; i < months; i++) {
            long count = countsByMonth.getOrDefault(current, 0L);
            String name = current.getMonth().getDisplayName(TextStyle.SHORT, tr);
            name = name.substring(0, 1).toUpperCase(tr) + name.substring(1).toLowerCase(tr);
            result.add(MonthlyGrowthDto.builder().name(name).users(count).sessions(count).build());
            current = current.plusMonths(1);
        }
        return result;
    }

    public List<UserDto> getPendingExperts() {
        return userRepository.findByRoleAndVerifiedFalseOrderByCreatedAtDesc(UserRole.EXPERT).stream()
                .map(this::toUserDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public ReportTargetPreviewDto getReportTargetPreview(UUID reportId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Sikayet bulunamadi"));
        return buildTargetPreview(report);
    }

    @Transactional
    public ReportDto warnReportTarget(UUID reportId, UUID adminId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Sikayet bulunamadi"));
        User targetUser = resolveTargetUser(report);
        if (targetUser == null) {
            throw new RuntimeException("Uyarilacak kullanici bulunamadi");
        }

        notificationService.createNotification(
                targetUser.getId(),
                "MODERATION_WARNING",
                "İçeriğiniz hakkında moderasyon uyarısı",
                "Platform kurallarına aykırı olabilecek bir içerik nedeniyle resmi uyarı aldınız. Lütfen topluluk kurallarına uygun paylaşım yapın.",
                "/forum"
        );

        report.setStatus("RESOLVED");
        report.setAdminNote("Kullanıcı uyarıldı.");
        Report saved = reportRepository.save(report);
        auditLogService.log(
                userRepository.findById(adminId).orElse(null),
                "REPORT_TARGET_WARNED",
                report.getTargetType(),
                report.getTargetId(),
                Map.of("reportId", report.getId(), "targetUserId", targetUser.getId())
        );
        return toReportDto(saved);
    }

    @Transactional
    public ReportDto removeReportTarget(UUID reportId, UUID adminId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Sikayet bulunamadi"));
        User targetUser = removeTargetContent(report);

        report.setStatus("RESOLVED");
        report.setAdminNote("Hedef içerik moderasyon kararıyla kaldırıldı.");
        Report saved = reportRepository.save(report);
        auditLogService.log(
                userRepository.findById(adminId).orElse(null),
                "REPORT_TARGET_REMOVED",
                report.getTargetType(),
                report.getTargetId(),
                Map.of("reportId", report.getId())
        );

        if (targetUser != null) {
            notificationService.createNotification(
                    targetUser.getId(),
                    "CONTENT_REMOVED",
                    "İçeriğiniz kaldırıldı",
                    "Bir içeriğiniz platform kurallarını ihlal ettiği için moderasyon tarafından kaldırıldı.",
                    "/forum"
            );
        }
        return toReportDto(saved);
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "experts", allEntries = true)
    public UserDto approveExpert(UUID expertId, UUID adminId) {
        User expert = userRepository.findById(expertId)
                .orElseThrow(() -> new RuntimeException("Uzman bulunamadi"));
        if (expert.getRole() != UserRole.EXPERT) {
            throw new ValidationException("Yalnızca uzman başvuruları onaylanabilir");
        }
        expert.setVerified(true);
        userRepository.save(expert);

        notificationService.createNotification(
                expert.getId(),
                "EXPERT_APPROVED",
                "Uzman basvurunuz onaylandi",
                "Artik platformda dogrulanmis uzman olarak gorunuyorsunuz. Profilinizi tamamlayip danisanlarinizla calismaya baslayabilirsiniz.",
                "/"
        );
        emailService.sendExpertApprovalEmail(expert.getEmail(), expert.getFullName());
        auditLogService.log(
                userRepository.findById(adminId).orElse(null),
                "EXPERT_APPROVED",
                "USER",
                expert.getId(),
                Map.of("expertId", expert.getId())
        );
        return toUserDto(expert);
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "experts", allEntries = true)
    public UserDto rejectExpert(UUID expertId, UUID adminId) {
        User expert = userRepository.findById(expertId)
                .orElseThrow(() -> new RuntimeException("Uzman bulunamadi"));
        if (expert.getRole() != UserRole.EXPERT) {
            throw new ValidationException("Yalnızca uzman başvuruları reddedilebilir");
        }
        expert.setRole(UserRole.PARENT);
        expert.setVerified(false);
        userRepository.save(expert);

        notificationService.createNotification(
                expert.getId(),
                "EXPERT_REJECTED",
                "Uzman basvurunuz reddedildi",
                "Basvurunuz su an icin onaylanmadi. Bilgilerinizi guncelleyip tekrar basvurabilirsiniz.",
                "/kayit/uzman"
        );
        emailService.sendExpertRejectionEmail(expert.getEmail(), expert.getFullName());
        auditLogService.log(
                userRepository.findById(adminId).orElse(null),
                "EXPERT_REJECTED",
                "USER",
                expert.getId(),
                Map.of("expertId", expert.getId())
        );
        return toUserDto(expert);
    }

    public List<ReportDto> getPendingReports() {
        return reportRepository.findByStatusOrderByCreatedAtDesc("PENDING", org.springframework.data.domain.Pageable.ofSize(20))
                .stream()
                .map(this::toReportDto)
                .toList();
    }

    private ReportTargetPreviewDto buildTargetPreview(Report report) {
        String targetType = report.getTargetType().toUpperCase(Locale.ROOT);
        return switch (targetType) {
            case "POST" -> forumPostRepository.findById(report.getTargetId())
                    .map(post -> ReportTargetPreviewDto.builder()
                            .targetType(report.getTargetType())
                            .targetId(report.getTargetId())
                            .available(true)
                            .title(post.getTitle())
                            .content(post.getContent())
                            .authorId(post.getAuthor().getId())
                            .authorName(post.getAuthor().getFullName())
                            .authorEmail(post.getAuthor().getEmail())
                            .createdAt(post.getCreatedAt())
                            .build())
                    .orElseGet(() -> missingTargetPreview(report));
            case "COMMENT" -> forumCommentRepository.findById(report.getTargetId())
                    .map(comment -> ReportTargetPreviewDto.builder()
                            .targetType(report.getTargetType())
                            .targetId(report.getTargetId())
                            .available(true)
                            .title("Forum yorumu")
                            .content(comment.getContent())
                            .authorId(comment.getAuthor().getId())
                            .authorName(comment.getAuthor().getFullName())
                            .authorEmail(comment.getAuthor().getEmail())
                            .createdAt(comment.getCreatedAt())
                            .build())
                    .orElseGet(() -> missingTargetPreview(report));
            case "MESSAGE" -> messageRepository.findById(report.getTargetId())
                    .map(message -> ReportTargetPreviewDto.builder()
                            .targetType(report.getTargetType())
                            .targetId(report.getTargetId())
                            .available(true)
                            .title("Özel mesaj")
                            .content(message.getContent())
                            .authorId(message.getSender().getId())
                            .authorName(message.getSender().getFullName())
                            .authorEmail(message.getSender().getEmail())
                            .createdAt(message.getSentAt())
                            .build())
                    .orElseGet(() -> missingTargetPreview(report));
            case "USER", "EXPERT" -> userRepository.findById(report.getTargetId())
                    .map(user -> ReportTargetPreviewDto.builder()
                            .targetType(report.getTargetType())
                            .targetId(report.getTargetId())
                            .available(true)
                            .title(user.getFullName())
                            .content((user.getRole() != null ? user.getRole().name() : "USER") + " hesabı")
                            .authorId(user.getId())
                            .authorName(user.getFullName())
                            .authorEmail(user.getEmail())
                            .createdAt(user.getCreatedAt())
                            .build())
                    .orElseGet(() -> missingTargetPreview(report));
            default -> missingTargetPreview(report);
        };
    }

    private ReportTargetPreviewDto missingTargetPreview(Report report) {
        return ReportTargetPreviewDto.builder()
                .targetType(report.getTargetType())
                .targetId(report.getTargetId())
                .available(false)
                .title("Hedef içerik bulunamadı")
                .content("Bu rapora bağlı kayıt silinmiş veya artık erişilebilir değil.")
                .build();
    }

    private User resolveTargetUser(Report report) {
        String targetType = report.getTargetType().toUpperCase(Locale.ROOT);
        return switch (targetType) {
            case "POST" -> forumPostRepository.findById(report.getTargetId()).map(ForumPost::getAuthor).orElse(null);
            case "COMMENT" -> forumCommentRepository.findById(report.getTargetId()).map(ForumComment::getAuthor).orElse(null);
            case "MESSAGE" -> messageRepository.findById(report.getTargetId()).map(Message::getSender).orElse(null);
            case "USER", "EXPERT" -> userRepository.findById(report.getTargetId()).orElse(null);
            default -> null;
        };
    }

    private User removeTargetContent(Report report) {
        String targetType = report.getTargetType().toUpperCase(Locale.ROOT);
        String removedText = "Bu içerik platform kurallarını ihlal ettiği için moderasyon tarafından kaldırıldı.";
        return switch (targetType) {
            case "POST" -> {
                ForumPost post = forumPostRepository.findById(report.getTargetId())
                        .orElseThrow(() -> new RuntimeException("Gonderi bulunamadi"));
                User author = post.getAuthor();
                post.setTitle("[Moderasyonla kaldırıldı]");
                post.setContent(removedText);
                forumPostRepository.save(post);
                yield author;
            }
            case "COMMENT" -> {
                ForumComment comment = forumCommentRepository.findById(report.getTargetId())
                        .orElseThrow(() -> new RuntimeException("Yorum bulunamadi"));
                User author = comment.getAuthor();
                comment.setContent(removedText);
                forumCommentRepository.save(comment);
                yield author;
            }
            case "MESSAGE" -> {
                Message message = messageRepository.findById(report.getTargetId())
                        .orElseThrow(() -> new RuntimeException("Mesaj bulunamadi"));
                User sender = message.getSender();
                message.setContent(removedText);
                messageRepository.save(message);
                yield sender;
            }
            case "USER", "EXPERT" -> {
                User user = userRepository.findById(report.getTargetId())
                        .orElseThrow(() -> new RuntimeException("Kullanici bulunamadi"));
                if (user.getRole() != UserRole.ADMIN) {
                    user.setIsActive(false);
                    userRepository.save(user);
                }
                yield user;
            }
            default -> throw new RuntimeException("Desteklenmeyen hedef tipi: " + report.getTargetType());
        };
    }

    private ReportDto toReportDto(Report report) {
        return ReportDto.builder()
                .id(report.getId())
                .targetType(report.getTargetType())
                .targetId(report.getTargetId())
                .reason(report.getReason())
                .status(report.getStatus())
                .adminNote(report.getAdminNote())
                .createdAt(report.getCreatedAt())
                .reporter(UserDto.builder()
                        .id(report.getReporter().getId())
                        .fullName(report.getReporter().getFullName())
                        .email(report.getReporter().getEmail())
                        .build())
                .build();
    }

    public Page<AuditLogDto> getAuditLogs(int page, int size, UUID userId, String action, String from, String to) {
        LocalDateTime fromDt = (from != null && !from.isBlank()) ? LocalDate.parse(from).atStartOfDay() : null;
        LocalDateTime toDt = (to != null && !to.isBlank()) ? LocalDate.parse(to).atTime(23, 59, 59) : null;
        String actionFilter = (action != null && !action.isBlank()) ? action : null;

        boolean hasFilters = userId != null || actionFilter != null || fromDt != null || toDt != null;
        if (hasFilters) {
            return auditLogRepository.findWithFilters(userId, actionFilter, fromDt, toDt, PageRequest.of(page, size))
                    .map(this::toAuditLogDto);
        }
        return auditLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size))
                .map(this::toAuditLogDto);
    }

    /** Kullanıcı detay panelinde gösterilecek gerçek aktivite özetini döner (sahte/örnek veri içermez). */
    public UserActivitySummaryDto getUserActivitySummary(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanici bulunamadi"));

        Long childrenCount = user.getRole() == UserRole.PARENT ? childRepository.countByParentId(userId) : null;
        Long appointmentsCount = user.getRole() == UserRole.EXPERT ? appointmentRepository.countByExpertId(userId) : null;

        List<AuditLogDto> recentActions = auditLogRepository.findTop3ByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toAuditLogDto).collect(Collectors.toList());

        return UserActivitySummaryDto.builder()
                .childrenCount(childrenCount)
                .appointmentsCount(appointmentsCount)
                .forumPostsCount(forumPostRepository.countByAuthorId(userId))
                .trackedActionsCount(auditLogRepository.countByUserId(userId))
                .recentActions(recentActions)
                .build();
    }

    private AuditLogDto toAuditLogDto(AuditLog log) {
        return AuditLogDto.builder()
                .id(log.getId())
                .userId(log.getUser() != null ? log.getUser().getId() : null)
                .userFullName(log.getUser() != null ? log.getUser().getFullName() : null)
                .userEmail(log.getUser() != null ? log.getUser().getEmail() : null)
                .action(log.getAction())
                .resourceType(log.getResourceType())
                .resourceId(log.getResourceId())
                .ipAddress(log.getIpAddress())
                .details(log.getDetails())
                .createdAt(log.getCreatedAt())
                .build();
    }

    public Page<UserDto> getAllUsers(int page, int size, String query, String roleStr) {
        UserRole role = null;
        if (roleStr != null && !roleStr.isBlank() && !roleStr.equals("ALL")) {
            try {
                role = UserRole.valueOf(roleStr);
            } catch (IllegalArgumentException ignored) {}
        }
        String q = (query != null && !query.isBlank()) ? query.trim() : null;
        PageRequest pageable = PageRequest.of(page, size);
        Page<User> users;
        if (q != null) {
            users = userRepository.searchForAdminByQuery(q, role, pageable);
        } else if (role != null) {
            users = userRepository.findAllByRoleOrderByCreatedAtDesc(role, pageable);
        } else {
            users = userRepository.findAllByOrderByCreatedAtDesc(pageable);
        }
        return users.map(this::toUserDto);
    }

    @Transactional
    public UserDto toggleUserStatus(UUID userId, UUID adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanici bulunamadi"));
        if (user.getId().equals(adminId)) {
            throw new RuntimeException("Kendinizi banlayamazsiniz");
        }
        user.setIsActive(!user.isActive());
        userRepository.save(user);

        String action = user.isActive() ? "USER_UNBANNED" : "USER_BANNED";
        auditLogService.log(
                userRepository.findById(adminId).orElse(null),
                action,
                "USER",
                user.getId(),
                Map.of("userId", user.getId(), "role", user.getRole().name())
        );
        return toUserDto(user);
    }

    @Transactional
    public Map<String, Integer> bulkToggleUserStatus(List<UUID> userIds, UUID adminId) {
        int updated = 0;
        for (UUID id : userIds) {
            if (id.equals(adminId)) continue;
            boolean changed = userRepository.findById(id).map(user -> {
                user.setIsActive(!user.isActive());
                userRepository.save(user);
                return true;
            }).orElse(false);
            if (changed) updated++;
        }
        return Map.of("updated", updated);
    }

    public String exportUsersAsCsv(String roleStr) {
        UserRole role = null;
        if (roleStr != null && !roleStr.isBlank() && !roleStr.equals("ALL")) {
            try { role = UserRole.valueOf(roleStr); } catch (IllegalArgumentException ignored) {}
        }
        // Use Pageable to avoid loading all users into memory at once for large datasets
        org.springframework.data.domain.Pageable largePage = org.springframework.data.domain.PageRequest.of(0, 10_000);
        List<User> users = role != null
                ? userRepository.findAllByRoleOrderByCreatedAtDesc(role, largePage).getContent()
                : userRepository.findAllByOrderByCreatedAtDesc(largePage).getContent();

        StringBuilder sb = new StringBuilder("ID,Ad Soyad,E-posta,Rol,Sehir,Kayit Tarihi,Aktif\n");
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
        for (User u : users) {
            sb.append(csvEscape(u.getId().toString())).append(',')
              .append(csvEscape(u.getFullName())).append(',')
              .append(csvEscape(u.getEmail())).append(',')
              .append(csvEscape(u.getRole().name())).append(',')
              .append(csvEscape(u.getCity() != null ? u.getCity() : "")).append(',')
              .append(csvEscape(u.getCreatedAt().format(fmt))).append(',')
              .append(u.isActive() ? "Evet" : "Hayir").append('\n');
        }
        return sb.toString();
    }

    private String csvEscape(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    public PlatformSettingsDto getPlatformSettings() {
        PlatformSettings s = platformSettingsRepository.findById("global")
                .orElse(new PlatformSettings());
        return PlatformSettingsDto.builder()
                .maintenanceMode(s.isMaintenanceMode())
                .registrationsOpen(s.isRegistrationsOpen())
                .aiEnabled(s.isAiEnabled())
                .build();
    }

    @Transactional
    public PlatformSettingsDto updatePlatformSettings(PlatformSettingsDto dto) {
        PlatformSettings s = platformSettingsRepository.findById("global")
                .orElse(PlatformSettings.builder().id("global").build());
        if (dto.getMaintenanceMode() != null) s.setMaintenanceMode(dto.getMaintenanceMode());
        if (dto.getRegistrationsOpen() != null) s.setRegistrationsOpen(dto.getRegistrationsOpen());
        if (dto.getAiEnabled() != null) s.setAiEnabled(dto.getAiEnabled());
        PlatformSettings saved = platformSettingsRepository.save(s);
        platformSettingsService.invalidate();
        return PlatformSettingsDto.builder()
                .maintenanceMode(saved.isMaintenanceMode())
                .registrationsOpen(saved.isRegistrationsOpen())
                .aiEnabled(saved.isAiEnabled())
                .build();
    }

    private static final Pattern JDBC_POSTGRES_URL = Pattern.compile("jdbc:postgresql://([^:/]+):(\\d+)/([^?]+)");

    /** Gercek pg_dump cagirarak veritabaninin SQL yedegini uretir ve indirilebilir byte dizisi olarak doner. */
    public byte[] generateDatabaseBackup(UUID adminId) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Yonetici bulunamadi"));

        Matcher matcher = JDBC_POSTGRES_URL.matcher(datasourceUrl);
        if (!matcher.find()) {
            throw new IllegalStateException("Veritabani baglanti adresi cozumlenemedi.");
        }
        String host = matcher.group(1);
        String port = matcher.group(2);
        String dbName = matcher.group(3);

        byte[] dump;
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "pg_dump",
                    "-h", host,
                    "-p", port,
                    "-U", datasourceUsername,
                    "--no-owner",
                    "--no-privileges",
                    "-F", "p",
                    dbName
            );
            pb.environment().put("PGPASSWORD", datasourcePassword);
            Process process = pb.start();

            ByteArrayOutputStream errBuffer = new ByteArrayOutputStream();
            Thread errReader = new Thread(() -> {
                try {
                    process.getErrorStream().transferTo(errBuffer);
                } catch (IOException ignored) {
                    // process ended, stream closed
                }
            });
            errReader.start();

            dump = process.getInputStream().readAllBytes();
            boolean finished = process.waitFor(120, TimeUnit.SECONDS);
            errReader.join(5000);
            if (!finished) {
                process.destroyForcibly();
                throw new IllegalStateException("Yedekleme zaman asimina ugradi.");
            }
            if (process.exitValue() != 0 || dump.length == 0) {
                String stderr = errBuffer.toString(StandardCharsets.UTF_8);
                log.error("pg_dump basarisiz oldu (exit={}): {}", process.exitValue(), stderr);
                throw new IllegalStateException("Yedekleme calistirilamadi. Sunucu loglarini kontrol edin.");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Yedekleme calistirilamadi: " + e.getMessage(), e);
        } catch (IOException e) {
            throw new IllegalStateException("Yedekleme calistirilamadi: " + e.getMessage(), e);
        }

        auditLogRepository.save(AuditLog.builder()
                .user(admin)
                .action("BACKUP_DOWNLOADED")
                .resourceType("SYSTEM")
                .details(Map.of("sizeBytes", dump.length, "database", dbName))
                .build());

        return dump;
    }

    public Map<String, Object> getTokenStats() {
        // Gemini API'si kullanım sayaçlarını dışa açmadığından bu değerler
        // yerel veritabanı metriklerine dayalı kaba tahmindir.
        long totalMessages = messageRepository.count();
        long totalPosts = forumPostRepository.count();
        long estimatedUsed = (totalMessages * 50L) + (totalPosts * 100L);
        long budget = 5_000_000L;
        long remaining = Math.max(0, budget - estimatedUsed);
        double cost = estimatedUsed * 0.0000000035 * 1000;
        return Map.of(
                "used", estimatedUsed,
                "budget", budget,
                "remaining", remaining,
                "cost", Math.round(cost * 100.0) / 100.0,
                "estimated", true,
                "updatedAt", LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm"))
        );
    }

    private UserDto toUserDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .role(user.getRole().name())
                .expertTitle(user.getExpertTitle())
                .city(user.getCity())
                .verified(user.isVerified())
                .licenseVerified(user.isLicenseVerified())
                .specializations(user.getSpecializations())
                .kvkkConsent(user.isKvkkConsent())
                .profileImageUrl(user.getProfileImageUrl())
                .institution(user.getInstitution())
                .licenseNumber(user.getLicenseNumber())
                .bio(user.getBio())
                .isActive(user.isActive())
                .createdAt(user.getCreatedAt())
                .build();
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "experts", allEntries = true)
    public UserDto verifyExpertLicense(UUID expertId, UUID adminId) {
        User expert = userRepository.findById(expertId)
                .orElseThrow(() -> new RuntimeException("Uzman bulunamadi"));
        if (expert.getRole() != UserRole.EXPERT || !expert.isVerified()) {
            throw new ValidationException("Onaylanmamış bir uzman için lisans doğrulanamaz");
        }
        expert.setLicenseVerified(true);
        expert.setLicenseVerifiedAt(java.time.LocalDateTime.now());
        userRepository.save(expert);

        notificationService.createNotification(
                expert.getId(),
                "LICENSE_VERIFIED",
                "Lisansiniz dogrulandi",
                "Lisans numaraniz platform yoneticisi tarafindan dogrulandi.",
                "/ayarlar"
        );
        auditLogService.log(
                userRepository.findById(adminId).orElse(null),
                "LICENSE_VERIFIED",
                "USER",
                expert.getId(),
                Map.of("expertId", expert.getId())
        );
        return toUserDto(expert);
    }

    @Transactional
    @org.springframework.cache.annotation.CacheEvict(value = "experts", allEntries = true)
    public UserDto revokeExpertLicense(UUID expertId, UUID adminId) {
        User expert = userRepository.findById(expertId)
                .orElseThrow(() -> new RuntimeException("Uzman bulunamadi"));
        if (expert.getRole() != UserRole.EXPERT) {
            throw new ValidationException("Yalnızca uzman hesaplarının lisans doğrulaması kaldırılabilir");
        }
        expert.setLicenseVerified(false);
        expert.setLicenseVerifiedAt(null);
        userRepository.save(expert);

        auditLogService.log(
                userRepository.findById(adminId).orElse(null),
                "LICENSE_VERIFICATION_REVOKED",
                "USER",
                expert.getId(),
                Map.of("expertId", expert.getId())
        );
        return toUserDto(expert);
    }
}
