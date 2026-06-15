package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.ExpertTaskDto;
import com.autismsupport.platform.dto.PatientSummaryDto;
import com.autismsupport.platform.model.*;
import com.autismsupport.platform.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Period;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PatientService {

    // Ebeveynin kalıcı olarak erişimi kestiği bağlantı durumları — bu durumlarda randevu geçmişine
    // bakılmaksızın erişim reddedilir.
    static final List<ConnectionStatus> TERMINAL_STATUSES =
            List.of(ConnectionStatus.REVOKED, ConnectionStatus.REJECTED, ConnectionStatus.BLOCKED);

    private final AppointmentRepository appointmentRepository;
    private final ExpertTaskRepository expertTaskRepository;
    private final ChildRepository childRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final ExpertPatientConnectionRepository expertPatientConnectionRepository;

    @Transactional(readOnly = true)
    public Page<PatientSummaryDto> getPatients(UUID expertId, Pageable pageable) {
        // Onaylı bağlantı kaydı olan danışanlar
        List<Child> connectedChildren = expertPatientConnectionRepository
                .findApprovedWithChildByExpertId(expertId, ConnectionStatus.APPROVED, Pageable.unpaged())
                .stream()
                .map(ExpertPatientConnection::getChild)
                .toList();

        // Tamamlanmış randevusu olan ama onaylı bağlantı kaydı bulunmayan danışanlar.
        // Terminal durumlu (REVOKED/REJECTED/BLOCKED) bağlantısı olanlar sorgu içinde dışlanır.
        Set<UUID> connectedIds = connectedChildren.stream().map(Child::getId).collect(Collectors.toSet());
        List<Child> appointmentChildren = appointmentRepository
                .findDistinctChildrenWithCompletedAppointments(expertId, TERMINAL_STATUSES)
                .stream()
                .filter(c -> !connectedIds.contains(c.getId()))
                .toList();

        // Listeler birleştirilir, ada göre deterministik sıralama uygulanır
        List<Child> allChildren = new ArrayList<>(connectedChildren.size() + appointmentChildren.size());
        allChildren.addAll(connectedChildren);
        allChildren.addAll(appointmentChildren);
        allChildren.sort(Comparator.comparing(Child::getName, String.CASE_INSENSITIVE_ORDER));

        // implicit kontrolü için: sadece randevudan gelen child ID'leri set'e al
        Set<UUID> implicitIds = appointmentChildren.stream().map(Child::getId).collect(Collectors.toSet());

        if (allChildren.isEmpty()) {
            return Page.empty(pageable);
        }

        List<UUID> childIds = allChildren.stream().map(Child::getId).toList();

        Map<UUID, long[]> taskCounts = expertTaskRepository
                .countTasksGroupedByChildren(expertId, childIds)
                .stream()
                .collect(Collectors.toMap(
                        TaskCountProjection::getChildId,
                        p -> new long[]{p.getTotal(), p.getCompleted()}
                ));

        Map<UUID, LocalDate> lastSessions = appointmentRepository
                .findLastSessionsByExpertAndChildren(expertId, childIds)
                .stream()
                .collect(Collectors.toMap(
                        LastSessionProjection::getChildId,
                        LastSessionProjection::getLastDate
                ));

        List<PatientSummaryDto> summaries = allChildren.stream()
                .map(child -> toPatientSummary(child, taskCounts, lastSessions, implicitIds))
                .toList();

        int total = summaries.size();
        int start = (int) Math.min(pageable.getOffset(), total);
        int end = Math.min(start + pageable.getPageSize(), total);
        return new PageImpl<>(summaries.subList(start, end), pageable, total);
    }

    /**
     * Randevu tamamlandığında çağrılır. Yalnızca PENDING veya hiç bağlantısı olmayan danışanlar için
     * APPROVED bağlantı oluşturur/günceller. Ebeveynin kapattığı (REVOKED/REJECTED/BLOCKED) bağlantılar
     * kesinlikle yeniden açılmaz.
     */
    @Transactional
    public void syncConnectionFromCompletedAppointment(Appointment appointment) {
        Child child = appointment.getChild();
        if (child == null) return;

        UUID expertId = appointment.getExpert().getId();
        UUID childId = child.getId();

        expertPatientConnectionRepository.findByExpertIdAndChildId(expertId, childId)
                .ifPresentOrElse(conn -> {
                    if (conn.getStatus() == ConnectionStatus.PENDING) {
                        conn.setStatus(ConnectionStatus.APPROVED);
                        expertPatientConnectionRepository.save(conn);
                        notifyParentAboutAutoConnection(appointment);
                    }
                    // REVOKED / REJECTED / BLOCKED: ebeveynin kararına saygı duyulur, değişiklik yapılmaz
                }, () -> {
                    expertPatientConnectionRepository.save(ExpertPatientConnection.builder()
                            .expert(appointment.getExpert())
                            .child(child)
                            .status(ConnectionStatus.APPROVED)
                            .build());
                    notifyParentAboutAutoConnection(appointment);
                });
    }

    private void notifyParentAboutAutoConnection(Appointment appointment) {
        if (appointment.getParent() == null) return;
        String childName = appointment.getChild() != null ? appointment.getChild().getName() : "çocuğunuz";
        UUID childId = appointment.getChild() != null ? appointment.getChild().getId() : null;
        notificationService.createNotification(
                appointment.getParent().getId(),
                "CONNECTION_AUTO_APPROVED",
                "Uzman erişimi oluşturuldu",
                appointment.getExpert().getFullName() + ", " + childName
                        + " için seans sonrası kalıcı erişim kazandı. Erişimi yönetmek için profile gidebilirsiniz.",
                childId != null ? "/cocuklarim/" + childId : "/cocuklarim"
        );
    }

    @Transactional(readOnly = true)
    public List<ExpertTaskDto> getTasks(UUID expertId, UUID childId) {
        validateExpertChildAccess(expertId, childId);
        return expertTaskRepository.findByExpertIdAndChildIdOrderByCreatedAtDesc(expertId, childId).stream()
                .map(this::toTaskDto)
                .toList();
    }

    @Transactional
    public ExpertTaskDto assignTask(UUID expertId, UUID childId, ExpertTaskDto dto) {
        Child child = validateExpertChildAccess(expertId, childId);
        User expert = userRepository.findById(expertId)
                .orElseThrow(() -> new RuntimeException("Uzman bulunamadi"));

        ExpertTask task = ExpertTask.builder()
                .expert(expert)
                .parent(child.getParent())
                .child(child)
                .title(dto.getTitle())
                .description(dto.getDescription())
                .category(dto.getCategory())
                .difficulty(dto.getDifficulty())
                .frequency(dto.getFrequency())
                .materialUrl(dto.getMaterialUrl())
                .dueDate(dto.getDueDate())
                .status(TaskStatus.PENDING)
                .build();

        ExpertTask saved = expertTaskRepository.save(task);
        notificationService.createNotification(
                child.getParent().getId(),
                "TASK_ASSIGNED",
                "Yeni uzman gorevi",
                expert.getFullName() + " cocugunuz icin yeni bir gorev atadi: " + task.getTitle(),
                "/gorevler"
        );
        auditLogService.log(expert, "TASK_ASSIGNED", "TASK", saved.getId(), Map.of(
                "childId", child.getId().toString(),
                "title", task.getTitle()
        ));
        return toTaskDto(saved);
    }

    @Transactional(readOnly = true)
    public List<ExpertTaskDto> getMyTasksAsParent(UUID parentId) {
        return expertTaskRepository.findByChildParentIdOrderByCreatedAtDesc(parentId).stream()
                .map(this::toTaskDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ExpertTaskDto> getTasksByExpert(UUID expertId) {
        return expertTaskRepository.findByExpertIdOrderByCreatedAtDesc(expertId).stream()
                .map(this::toTaskDto)
                .toList();
    }

    @Transactional
    public ExpertTaskDto updateTask(UUID taskId, UUID expertId, ExpertTaskDto dto) {
        ExpertTask task = expertTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Gorev bulunamadi"));
        if (!task.getExpert().getId().equals(expertId)) {
            throw new AccessDeniedException("Bu gorevi guncelleme yetkiniz yok");
        }
        if (task.getStatus() != TaskStatus.PENDING) {
            throw new RuntimeException("Yalnizca bekleyen (PENDING) gorevler guncellenebilir");
        }
        if (dto.getTitle() != null) task.setTitle(dto.getTitle());
        if (dto.getDescription() != null) task.setDescription(dto.getDescription());
        if (dto.getCategory() != null) task.setCategory(dto.getCategory());
        if (dto.getDifficulty() != null) task.setDifficulty(dto.getDifficulty());
        if (dto.getFrequency() != null) task.setFrequency(dto.getFrequency());
        if (dto.getMaterialUrl() != null) task.setMaterialUrl(dto.getMaterialUrl());
        if (dto.getDueDate() != null) task.setDueDate(dto.getDueDate());
        // Uzman yalnızca CANCELLED yapabilir — COMPLETED geçişi parent submission akışına aittir
        if (dto.getStatus() == TaskStatus.CANCELLED) task.setStatus(TaskStatus.CANCELLED);
        return toTaskDto(expertTaskRepository.save(task));
    }

    @Transactional
    public void deleteTask(UUID taskId, UUID expertId) {
        ExpertTask task = expertTaskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Gorev bulunamadi"));
        if (!task.getExpert().getId().equals(expertId)) {
            throw new AccessDeniedException("Bu gorevi silme yetkiniz yok");
        }
        expertTaskRepository.delete(task);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getExpertStats(UUID expertId) {
        long totalTasks = expertTaskRepository.countByExpertId(expertId);
        long completedTasks = expertTaskRepository.countByExpertIdAndStatus(expertId, TaskStatus.COMPLETED);
        long cancelledAppointments = appointmentRepository.countByExpertIdAndStatus(expertId, "CANCELLED");
        long completedAppointments = appointmentRepository.countByExpertIdAndStatus(expertId, "COMPLETED");
        Double avgRating = appointmentRepository.getAverageRatingByExpertId(expertId);

        Map<String, Object> stats = new HashMap<>();
        stats.put("completedThisMonth", completedAppointments);
        stats.put("cancelledThisMonth", cancelledAppointments);
        stats.put("totalThisMonth", appointmentRepository.countByExpertId(expertId));
        stats.put("avgRating", avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : null);
        stats.put("pendingTasksCount", totalTasks - completedTasks);
        stats.put("monthlyData", List.of());
        return stats;
    }

    // Terminal bağlantı (REVOKED/REJECTED/BLOCKED) varsa randevu geçmişine bakmaksızın erişim reddedilir.
    // Terminal bağlantı yoksa; APPROVED bağlantı veya tamamlanmış randevu erişime izin verir.
    private Child validateExpertChildAccess(UUID expertId, UUID childId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new RuntimeException("Cocuk bulunamadi"));

        if (expertPatientConnectionRepository.existsByExpertIdAndChildIdAndStatusIn(expertId, childId, TERMINAL_STATUSES)) {
            throw new AccessDeniedException("Bu danisana erisim yetkiniz yok");
        }

        boolean hasApproved = expertPatientConnectionRepository
                .existsByExpertIdAndChildIdAndStatus(expertId, childId, ConnectionStatus.APPROVED);
        boolean hasCompletedAppointment = !hasApproved &&
                appointmentRepository.existsByExpertIdAndChildIdAndStatusIn(expertId, childId, List.of("COMPLETED"));

        if (!hasApproved && !hasCompletedAppointment) {
            throw new AccessDeniedException("Bu danisana erisim yetkiniz yok");
        }
        return child;
    }

    private PatientSummaryDto toPatientSummary(Child child,
                                               Map<UUID, long[]> taskCounts,
                                               Map<UUID, LocalDate> lastSessions,
                                               Set<UUID> implicitIds) {
        long[] counts = taskCounts.getOrDefault(child.getId(), new long[]{0, 0});
        return PatientSummaryDto.builder()
                .id(child.getId())
                .parentId(child.getParent().getId())
                .childId(child.getId())
                .name(child.getName())
                .parentName(child.getParent().getFullName())
                .age(child.getBirthDate() == null ? 0 : Math.max(0, Period.between(child.getBirthDate(), LocalDate.now()).getYears()))
                .diagnosis(child.getDiagnosisInfo())
                .lastSessionDate(lastSessions.get(child.getId()))
                .tasksCompleted((int) counts[1])
                .totalTasks((int) counts[0])
                .implicit(implicitIds.contains(child.getId()))
                .build();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> searchParentForExpert(String email) {
        User parent = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Bu e-posta adresine sahip bir ebeveyn bulunamadi"));

        if (parent.getRole() != UserRole.PARENT) {
            throw new RuntimeException("Belirtilen e-posta adresine sahip kullanici bir ebeveyn degil");
        }

        if (!parent.isMatchingEnabled()) {
            throw new RuntimeException("Bu kullanici uzman arama icin aranabilirligini kapatti");
        }

        List<Child> children = childRepository.findByParentId(parent.getId());
        List<Map<String, Object>> childList = children.stream().map(c -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", c.getId());
            map.put("name", c.getName());
            map.put("diagnosis", c.getDiagnosisInfo());
            return map;
        }).toList();

        Map<String, Object> response = new HashMap<>();
        response.put("parentId", parent.getId());
        response.put("parentName", parent.getFullName());
        response.put("parentEmail", parent.getEmail());
        response.put("children", childList);
        return response;
    }

    @Transactional
    public void addPatientManually(UUID expertId, String parentEmail, UUID childId) {
        User expert = userRepository.findById(expertId)
                .orElseThrow(() -> new RuntimeException("Uzman bulunamadi"));

        User parent = userRepository.findByEmail(parentEmail)
                .orElseThrow(() -> new RuntimeException("Bu e-posta adresine sahip bir ebeveyn bulunamadi"));

        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new RuntimeException("Cocuk bulunamadi"));

        if (!child.getParent().getId().equals(parent.getId())) {
            throw new RuntimeException("Secilen cocuk belirtilen ebeveyne ait degil");
        }

        Optional<ExpertPatientConnection> existingOpt = expertPatientConnectionRepository
                .findByExpertIdAndChildId(expertId, childId);
        if (existingOpt.isPresent()) {
            ExpertPatientConnection existing = existingOpt.get();
            switch (existing.getStatus()) {
                case APPROVED -> throw new RuntimeException("Bu danisan zaten listenizde ekli");
                case PENDING -> throw new RuntimeException("Bu danisan icin zaten bekleyen bir isteginiz var");
                case REVOKED -> throw new RuntimeException("Bu danisan ile baglantiniz ebeveyn tarafindan kesilmis. Tekrar istek gonderemezsiniz.");
                case REJECTED, BLOCKED -> throw new RuntimeException("Erisim isteginiz reddedilmis veya engellenmis. Tekrar istek gonderemezsiniz.");
            }
        } else {
            expertPatientConnectionRepository.save(ExpertPatientConnection.builder()
                    .expert(expert)
                    .child(child)
                    .status(ConnectionStatus.PENDING)
                    .build());
        }

        notificationService.createNotification(
                parent.getId(),
                "PATIENT_LINKED",
                "Yeni uzman erisim istegi",
                expert.getFullName() + " cocugunuz " + child.getName() + " icin profil erisim istegi gonderdi. Lutfen onaylayin.",
                "/cocuklarim/" + child.getId()
        );

        auditLogService.log(expert, "PATIENT_LINK_REQUESTED", "CHILD", child.getId(), Map.of(
                "parentEmail", parentEmail,
                "childName", child.getName()
        ));
    }

    private ExpertTaskDto toTaskDto(ExpertTask task) {
        return ExpertTaskDto.builder()
                .id(task.getId())
                .expertId(task.getExpert().getId())
                .parentId(task.getParent().getId())
                .childId(task.getChild().getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .category(task.getCategory())
                .difficulty(task.getDifficulty())
                .frequency(task.getFrequency())
                .materialUrl(task.getMaterialUrl())
                .dueDate(task.getDueDate())
                .status(task.getStatus())
                .build();
    }

    @Transactional
    public void approveConnection(UUID parentId, UUID connectionId) {
        ExpertPatientConnection conn = expertPatientConnectionRepository.findById(connectionId)
                .orElseThrow(() -> new RuntimeException("Istek bulunamadi"));

        if (!conn.getChild().getParent().getId().equals(parentId)) {
            throw new AccessDeniedException("Bu islem icin yetkiniz yok");
        }

        conn.setStatus(ConnectionStatus.APPROVED);
        expertPatientConnectionRepository.save(conn);

        notificationService.createNotification(
                conn.getExpert().getId(),
                "CONNECTION_APPROVED",
                "Istek Onaylandi",
                conn.getChild().getParent().getFullName() + " erisim isteginizi onayladi.",
                "/hastalar"
        );
    }

    @Transactional
    public void rejectConnection(UUID parentId, UUID connectionId) {
        ExpertPatientConnection conn = expertPatientConnectionRepository.findById(connectionId)
                .orElseThrow(() -> new RuntimeException("Istek bulunamadi"));

        if (!conn.getChild().getParent().getId().equals(parentId)) {
            throw new AccessDeniedException("Bu islem icin yetkiniz yok");
        }

        conn.setStatus(ConnectionStatus.REJECTED);
        expertPatientConnectionRepository.save(conn);

        notificationService.createNotification(
                conn.getExpert().getId(),
                "CONNECTION_REJECTED",
                "Istek Reddedildi",
                conn.getChild().getParent().getFullName() + " erisim isteginizi reddetti.",
                "/hastalar"
        );
    }

    @Transactional
    public void revokeConnection(UUID parentId, UUID connectionId) {
        ExpertPatientConnection conn = expertPatientConnectionRepository.findById(connectionId)
                .orElseThrow(() -> new RuntimeException("Baglanti bulunamadi"));

        if (!conn.getChild().getParent().getId().equals(parentId)) {
            throw new AccessDeniedException("Bu islem icin yetkiniz yok");
        }

        conn.setStatus(ConnectionStatus.REVOKED);
        expertPatientConnectionRepository.save(conn);

        UUID expertId = conn.getExpert().getId();
        UUID childId = conn.getChild().getId();

        expertTaskRepository.bulkUpdateStatus(expertId, childId, TaskStatus.PENDING, TaskStatus.CANCELLED);
        appointmentRepository.cancelPendingByExpertAndChild(expertId, childId);

        notificationService.createNotification(
                expertId,
                "CONNECTION_REVOKED",
                "Erisim Kaldirildi",
                conn.getChild().getParent().getFullName() + " " + conn.getChild().getName() + " icin erisim izninizi kaldirdi.",
                "/hastalar"
        );
    }

    @Transactional
    public void cancelConnectionRequest(UUID expertId, UUID connectionId) {
        ExpertPatientConnection conn = expertPatientConnectionRepository.findById(connectionId)
                .orElseThrow(() -> new RuntimeException("Istek bulunamadi"));

        if (!conn.getExpert().getId().equals(expertId)) {
            throw new AccessDeniedException("Bu islem icin yetkiniz yok");
        }

        if (conn.getStatus() != ConnectionStatus.PENDING) {
            throw new RuntimeException("Sadece bekleyen istekler iptal edilebilir");
        }

        expertPatientConnectionRepository.delete(conn);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getSentConnectionRequestsForExpert(UUID expertId) {
        return expertPatientConnectionRepository.findByExpertIdAndStatus(expertId, ConnectionStatus.PENDING)
                .stream()
                .map(conn -> connectionResponse(conn, false))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getConnectionRequestsForParent(UUID parentId) {
        return expertPatientConnectionRepository.findByChildParentIdAndStatus(parentId, ConnectionStatus.PENDING)
                .stream()
                .map(conn -> connectionResponse(conn, true))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getActiveConnectionsForParent(UUID parentId) {
        return expertPatientConnectionRepository.findByChildParentIdAndStatus(parentId, ConnectionStatus.APPROVED)
                .stream()
                .map(conn -> connectionResponse(conn, true))
                .toList();
    }

    private Map<String, Object> connectionResponse(ExpertPatientConnection conn, boolean includeExpert) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", conn.getId());
        if (includeExpert) {
            response.put("expertId", conn.getExpert().getId());
            response.put("expertName", conn.getExpert().getFullName());
        }
        response.put("childId", conn.getChild().getId());
        response.put("childName", conn.getChild().getName());
        response.put("parentName", conn.getChild().getParent().getFullName());
        response.put("createdAt", conn.getCreatedAt());
        return response;
    }
}
