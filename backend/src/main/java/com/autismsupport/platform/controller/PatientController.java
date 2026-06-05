package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.ExpertTaskDto;
import com.autismsupport.platform.dto.PatientSummaryDto;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.PatientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService patientService;

    @GetMapping
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<ApiResponse<List<PatientSummaryDto>>> getPatients(@CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(patientService.getPatients(principal.getId())));
    }

    @GetMapping("/{childId}/tasks")
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<ApiResponse<List<ExpertTaskDto>>> getTasks(
            @PathVariable UUID childId,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(patientService.getTasks(principal.getId(), childId)));
    }

    @GetMapping("/my-tasks")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<ExpertTaskDto>>> getMyTasks(@CurrentUser UserPrincipal principal) {
        boolean isExpert = principal.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_EXPERT".equals(authority.getAuthority()));
        List<ExpertTaskDto> tasks = isExpert
                ? patientService.getTasksByExpert(principal.getId())
                : patientService.getMyTasksAsParent(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(tasks));
    }

    @PostMapping("/{childId}/tasks")
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<ApiResponse<ExpertTaskDto>> assignTask(
            @PathVariable UUID childId,
            @Valid @RequestBody ExpertTaskDto dto,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                "Gorev atandi",
                patientService.assignTask(principal.getId(), childId, dto)
        ));
    }

    @PutMapping("/tasks/{taskId}")
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<ApiResponse<ExpertTaskDto>> updateTask(
            @PathVariable UUID taskId,
            @RequestBody ExpertTaskDto dto,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Gorev guncellendi", patientService.updateTask(taskId, principal.getId(), dto)));
    }

    @DeleteMapping("/tasks/{taskId}")
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<ApiResponse<Void>> deleteTask(
            @PathVariable UUID taskId,
            @CurrentUser UserPrincipal principal) {
        patientService.deleteTask(taskId, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Gorev silindi", null));
    }

    @GetMapping("/search-parent")
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> searchParent(
            @RequestParam String email,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(patientService.searchParentForExpert(email)));
    }

    @PostMapping("/add")
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<ApiResponse<PatientSummaryDto>> addPatient(
            @RequestBody Map<String, String> body,
            @CurrentUser UserPrincipal principal) {
        String email = body.get("parentEmail");
        UUID childId = UUID.fromString(body.get("childId"));
        return ResponseEntity.ok(ApiResponse.success(
                "Danisan basariyla eklendi",
                patientService.addPatientManually(principal.getId(), email, childId)
        ));
    }
}
