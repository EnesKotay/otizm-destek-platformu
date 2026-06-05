package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.TaskSubmissionDto;
import com.autismsupport.platform.model.ExpertTask;
import com.autismsupport.platform.model.TaskSubmission;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.ExpertTaskRepository;
import com.autismsupport.platform.repository.TaskSubmissionRepository;
import com.autismsupport.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskSubmissionService {

    private final TaskSubmissionRepository taskSubmissionRepository;
    private final ExpertTaskRepository expertTaskRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<TaskSubmissionDto> getSubmissionsForTask(UUID taskId) {
        return taskSubmissionRepository.findByTaskId(taskId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public TaskSubmissionDto submitTask(TaskSubmissionDto dto, UUID currentUserId) {
        ExpertTask task = expertTaskRepository.findById(dto.getTaskId())
                .orElseThrow(() -> new RuntimeException("Gorev bulunamadi"));

        // Sadece gorevin atandigi ebeveyn teslim edebilir
        if (!task.getParent().getId().equals(currentUserId)) {
            throw new AccessDeniedException("Bu gorevi teslim etme yetkiniz yok");
        }

        User parent = task.getParent();

        TaskSubmission submission = TaskSubmission.builder()
                .task(task)
                .parent(parent)
                .parentNote(dto.getParentNote())
                .evidenceUrl(dto.getEvidenceUrl())
                .expertReviewed(false)
                .build();

        submission = taskSubmissionRepository.save(submission);

        task.setStatus("COMPLETED");
        expertTaskRepository.save(task);

        // Uzmana bildirim gonder
        notificationService.createNotification(
                task.getExpert().getId(),
                "TASK_COMPLETED",
                "Gorev tamamlandi",
                parent.getFullName() + " \"" + task.getTitle() + "\" gorevini tamamladi.",
                "/patients"
        );

        return mapToDto(submission);
    }

    @Transactional
    public TaskSubmissionDto reviewSubmission(UUID submissionId, String expertFeedback, UUID expertId) {
        TaskSubmission submission = taskSubmissionRepository.findById(submissionId)
                .orElseThrow(() -> new RuntimeException("Geri bildirim kaydi bulunamadi"));

        // Sadece gorevi atayan uzman geri bildirim verebilir
        if (!submission.getTask().getExpert().getId().equals(expertId)) {
            throw new AccessDeniedException("Bu goreve geri bildirim verme yetkiniz yok");
        }

        submission.setExpertFeedback(expertFeedback);
        submission.setExpertReviewed(true);

        // Ebeveyne bildirim gonder
        notificationService.createNotification(
                submission.getParent().getId(),
                "TASK_REVIEWED",
                "Uzman goreve geri bildirim verdi",
                "\"" + submission.getTask().getTitle() + "\" gorevi icin uzman geri bildirimini inceleyebilirsiniz.",
                "/tasks"
        );

        return mapToDto(taskSubmissionRepository.save(submission));
    }

    private TaskSubmissionDto mapToDto(TaskSubmission submission) {
        return TaskSubmissionDto.builder()
                .id(submission.getId())
                .taskId(submission.getTask().getId())
                .parentId(submission.getParent().getId())
                .parentNote(submission.getParentNote())
                .evidenceUrl(submission.getEvidenceUrl())
                .expertFeedback(submission.getExpertFeedback())
                .expertReviewed(submission.isExpertReviewed())
                .submittedAt(submission.getSubmittedAt())
                .updatedAt(submission.getUpdatedAt())
                .build();
    }
}
