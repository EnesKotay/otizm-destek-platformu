package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.TaskReviewRequest;
import com.autismsupport.platform.dto.TaskSubmissionDto;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.TaskSubmissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/task-submissions")
@RequiredArgsConstructor
public class TaskSubmissionController {

    private final TaskSubmissionService taskSubmissionService;

    @GetMapping("/task/{taskId}")
    public ResponseEntity<ApiResponse<List<TaskSubmissionDto>>> getSubmissionsForTask(
            @PathVariable UUID taskId,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(taskSubmissionService.getSubmissionsForTask(taskId)));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TaskSubmissionDto>> submitTask(
            @RequestBody TaskSubmissionDto dto,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                "Gorev tamamlandi",
                taskSubmissionService.submitTask(dto, principal.getId())
        ));
    }

    @PostMapping("/{submissionId}/review")
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<ApiResponse<TaskSubmissionDto>> reviewSubmission(
            @PathVariable UUID submissionId,
            @Valid @RequestBody TaskReviewRequest request,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                "Geri bildirim kaydedildi",
                taskSubmissionService.reviewSubmission(submissionId, request.getExpertFeedback(), principal.getId())
        ));
    }
}
