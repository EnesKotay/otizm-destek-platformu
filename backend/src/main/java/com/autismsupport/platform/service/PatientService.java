package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.ExpertTaskDto;
import com.autismsupport.platform.dto.PatientSummaryDto;
import com.autismsupport.platform.model.*;
import com.autismsupport.platform.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
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

    private final AppointmentRepository appointmentRepository;
    private final ExpertTaskRepository expertTaskRepository;
    private final ChildRepository childRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final ExpertPatientConnectionRepository expertPatientConnectionRepository;

    @Transactional(readOnly = true)
    public Page<PatientSummaryDto> getPatients(UUID expertId, Pageable pageable) {
        Page<ExpertPatientConnection> connections = expertPatientConnectionRepository
                .findApprovedWithChildByExpertId(expertId, ConnectionStatus.APPROVED, pageable);

        List<UUID> childIds = connections.stream()
                .map(c -> c.getChild().getId())
                .toList();

        if (childIds.isEmpty()) {
            return Page.empty(pageable);
        }

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

        return connections.map(conn -> toPatientSummary(conn.getChild(), taskCounts, lastSessions));
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
        if (dto.getStatus() != null) task.setStatus(dto.getStatus());
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

    private Child validateExpertChildAccess(UUID expertId, UUID childId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new RuntimeException("Cocuk bulunamadi"));

        boolean hasAccess = expertPatientConnectionRepository
                .existsByExpertIdAndChildIdAndStatus(expertId, childId, ConnectionStatus.APPROVED);

        if (!hasAccess) {
            throw new AccessDeniedException("Bu danisana erisim yetkiniz yok");
        }
        return child;
    }

    private PatientSummaryDto toPatientSummary(Child child,
                                               Map<UUID, long[]> taskCounts,
                                               Map<UUID, LocalDate> lastSessions) {
        long[] counts = taskCounts.getOrDefault(child.getId(), new long[]{0, 0});
        LocalDate lastSessionDate = lastSessions.get(child.getId());
        String lastSession = lastSessionDate != null ? lastSessionDate.toString() : "Henuz tamamlanan seans yok";

        return PatientSummaryDto.builder()
                .id(child.getId())
                .parentId(child.getParent().getId())
                .childId(child.getId())
                .name(child.getName())
                .parentName(child.getParent().getFullName())
                .age(child.getBirthDate() == null ? 0 : Math.max(0, Period.between(child.getBirthDate(), LocalDate.now()).getYears()))
                .diagnosis(child.getDiagnosisInfo())
                .lastSession(lastSession)
                .tasksCompleted((int) counts[1])
                .totalTasks((int) counts[0])
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
                .map(conn -> Map.<String, Object>of(
                        "id", conn.getId(),
                        "childId", conn.getChild().getId(),
                        "childName", conn.getChild().getName(),
                        "parentName", conn.getChild().getParent().getFullName(),
                        "createdAt", conn.getCreatedAt()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getConnectionRequestsForParent(UUID parentId) {
        return expertPatientConnectionRepository.findByChildParentIdAndStatus(parentId, ConnectionStatus.PENDING)
                .stream()
                .map(conn -> Map.<String, Object>of(
                        "id", conn.getId(),
                        "expertId", conn.getExpert().getId(),
                        "expertName", conn.getExpert().getFullName(),
                        "childId", conn.getChild().getId(),
                        "childName", conn.getChild().getName(),
                        "createdAt", conn.getCreatedAt()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getActiveConnectionsForParent(UUID parentId) {
        return expertPatientConnectionRepository.findByChildParentIdAndStatus(parentId, ConnectionStatus.APPROVED)
                .stream()
                .map(conn -> Map.<String, Object>of(
                        "id", conn.getId(),
                        "expertId", conn.getExpert().getId(),
                        "expertName", conn.getExpert().getFullName(),
                        "childId", conn.getChild().getId(),
                        "childName", conn.getChild().getName(),
                        "createdAt", conn.getCreatedAt()
                ))
                .toList();
    }
}
