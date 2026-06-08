package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.ExpertTaskDto;
import com.autismsupport.platform.dto.PatientSummaryDto;
import com.autismsupport.platform.model.*;
import com.autismsupport.platform.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Period;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PatientService {

    private static final List<String> PATIENT_ACCESS_STATUSES = List.of("CONFIRMED", "COMPLETED");

    private final AppointmentRepository appointmentRepository;
    private final ExpertTaskRepository expertTaskRepository;
    private final ChildRepository childRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<PatientSummaryDto> getPatients(UUID expertId) {
        Map<UUID, Child> children = new LinkedHashMap<>();

        appointmentRepository.findByExpertIdAndStatusInOrderByAppointmentDateAscAppointmentTimeAsc(expertId, PATIENT_ACCESS_STATUSES)
                .forEach(appointment -> children.put(appointment.getChild().getId(), appointment.getChild()));

        // Fix 2: findAll() yerine expertId'ye gore sorgu
        expertTaskRepository.findByExpertIdOrderByCreatedAtDesc(expertId)
                .forEach(task -> children.put(task.getChild().getId(), task.getChild()));

        return children.values().stream()
                .map(child -> toPatientSummary(expertId, child))
                .toList();
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
                .status(dto.getStatus() == null || dto.getStatus().isBlank() ? "PENDING" : dto.getStatus())
                .build();

        ExpertTask saved = expertTaskRepository.save(task);
        notificationService.createNotification(
                child.getParent().getId(),
                "TASK_ASSIGNED",
                "Yeni uzman gorevi",
                expert.getFullName() + " cocugunuz icin yeni bir gorev atadi: " + task.getTitle(),
                "/patients"
        );
        auditLogService.log(expert, "TASK_ASSIGNED", "TASK", saved.getId(), Map.of(
                "childId", child.getId().toString(),
                "title", task.getTitle()
        ));
        return toTaskDto(saved);
    }

    @Transactional(readOnly = true)
    public List<ExpertTaskDto> getMyTasksAsParent(UUID parentId) {
        return expertTaskRepository.findByParentIdOrderByCreatedAtDesc(parentId).stream()
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
        long completedTasks = expertTaskRepository.countByExpertIdAndStatus(expertId, "COMPLETED");
        long cancelledAppointments = appointmentRepository.countByExpertIdAndStatus(expertId, "CANCELLED");
        long completedAppointments = appointmentRepository.countByExpertIdAndStatus(expertId, "COMPLETED");

        return Map.of(
            "completedThisMonth", completedAppointments,
            "cancelledThisMonth", cancelledAppointments,
            "totalThisMonth", appointmentRepository.countByExpertId(expertId),
            "avgRating", 5.0,
            "pendingTasksCount", totalTasks - completedTasks,
            "monthlyData", List.of()
        );
    }

    private Child validateExpertChildAccess(UUID expertId, UUID childId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new RuntimeException("Cocuk bulunamadi"));

        boolean hasActiveAppointment = appointmentRepository
                .findByExpertIdAndParentIdAndStatusIn(expertId, child.getParent().getId(), PATIENT_ACCESS_STATUSES)
                .stream()
                .anyMatch(appointment -> appointment.getChild().getId().equals(childId));

        boolean hasTask = expertTaskRepository
                .findByExpertIdAndChildIdOrderByCreatedAtDesc(expertId, childId)
                .stream()
                .findAny()
                .isPresent();

        if (!hasActiveAppointment && !hasTask) {
            throw new AccessDeniedException("Bu danisana erisim yetkiniz yok");
        }
        return child;
    }

    private PatientSummaryDto toPatientSummary(UUID expertId, Child child) {
        // Fix 4: "Son seans" = COMPLETED randevular; CANCELLED ve PENDING haric
        List<Appointment> appointments = appointmentRepository
                .findByExpertIdAndParentIdAndStatusIn(expertId, child.getParent().getId(), PATIENT_ACCESS_STATUSES)
                .stream()
                .filter(a -> a.getChild().getId().equals(child.getId()))
                .filter(a -> "COMPLETED".equals(a.getStatus()))
                .sorted(Comparator.comparing(Appointment::getAppointmentDate).reversed()
                        .thenComparing(Appointment::getAppointmentTime, Comparator.reverseOrder()))
                .toList();
        String lastSession = appointments.isEmpty()
                ? "Henuz tamamlanan seans yok"
                : appointments.getFirst().getAppointmentDate().toString();

        long totalTasks = expertTaskRepository.countByExpertIdAndChildId(expertId, child.getId());
        long completedTasks = expertTaskRepository.countByExpertIdAndChildIdAndStatus(expertId, child.getId(), "COMPLETED");

        return PatientSummaryDto.builder()
                .id(child.getId())
                .parentId(child.getParent().getId())
                .childId(child.getId())
                .name(child.getName())
                .parentName(child.getParent().getFullName())
                .age(child.getBirthDate() == null ? 0 : Math.max(0, Period.between(child.getBirthDate(), LocalDate.now()).getYears()))
                .diagnosis(child.getDiagnosisInfo())
                .lastSession(lastSession)
                .tasksCompleted((int) completedTasks)
                .totalTasks((int) totalTasks)
                .build();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> searchParentForExpert(String email) {
        User parent = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Bu e-posta adresine sahip bir ebeveyn bulunamadi"));
        
        if (parent.getRole() != UserRole.PARENT) {
            throw new RuntimeException("Belirtilen e-posta adresine sahip kullanici bir ebeveyn degil");
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
    public PatientSummaryDto addPatientManually(UUID expertId, String parentEmail, UUID childId) {
        User expert = userRepository.findById(expertId)
                .orElseThrow(() -> new RuntimeException("Uzman bulunamadi"));
        
        User parent = userRepository.findByEmail(parentEmail)
                .orElseThrow(() -> new RuntimeException("Bu e-posta adresine sahip bir ebeveyn bulunamadi"));

        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new RuntimeException("Cocuk bulunamadi"));

        if (!child.getParent().getId().equals(parent.getId())) {
            throw new RuntimeException("Secilen cocuk belirtilen ebeveyne ait degil");
        }

        // Zaten ekli mi kontrol et
        boolean alreadyLinked = appointmentRepository
                .findByExpertIdAndParentIdAndStatusIn(expertId, parent.getId(), PATIENT_ACCESS_STATUSES)
                .stream()
                .anyMatch(a -> a.getChild().getId().equals(childId));

        if (alreadyLinked) {
            throw new RuntimeException("Bu danisan zaten listenizde ekli");
        }

        // Baglantiyi saglamak icin tamamlanmis veya onaylanmis bir randevu kaydi olusturalim
        Appointment connection = Appointment.builder()
                .expert(expert)
                .parent(parent)
                .child(child)
                .appointmentDate(LocalDate.now())
                .appointmentTime(LocalTime.now())
                .duration(50)
                .type("ONLINE")
                .status("CONFIRMED")
                .notes("Manuel olarak uzman tarafindan eklendi")
                .build();

        appointmentRepository.save(connection);

        // Ayrica ebeveyne bildirim gonderelim
        notificationService.createNotification(
                parent.getId(),
                "PATIENT_LINKED",
                "Yeni uzman baglantisi",
                expert.getFullName() + " sizi danisan olarak ekledi.",
                "/patients"
        );

        auditLogService.log(expert, "PATIENT_LINKED", "CHILD", child.getId(), Map.of(
                "parentEmail", parentEmail,
                "childName", child.getName()
        ));

        return toPatientSummary(expertId, child);
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
}
