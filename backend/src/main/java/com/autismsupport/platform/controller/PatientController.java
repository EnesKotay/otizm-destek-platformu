package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.AddPatientRequest;
import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.ExpertTaskDto;
import com.autismsupport.platform.dto.PatientSummaryDto;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.PatientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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
    public ResponseEntity<ApiResponse<Page<PatientSummaryDto>>> getPatients(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @CurrentUser UserPrincipal principal) {
        PageRequest pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(ApiResponse.success(patientService.getPatients(principal.getId(), pageable)));
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
    public ResponseEntity<ApiResponse<Void>> addPatient(
            @Valid @RequestBody AddPatientRequest request,
            @CurrentUser UserPrincipal principal) {
        patientService.addPatientManually(principal.getId(), request.getParentEmail(), request.getChildId());
        return ResponseEntity.ok(ApiResponse.success(
                "Erişim isteği gönderildi. Veli onayladığında listenizde görünecektir.", null));
    }

    @GetMapping("/connections/requests")
    @PreAuthorize("hasRole('PARENT')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getConnectionRequests(@CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(patientService.getConnectionRequestsForParent(principal.getId())));
    }

    @GetMapping("/connections/active")
    @PreAuthorize("hasRole('PARENT')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getActiveConnections(@CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(patientService.getActiveConnectionsForParent(principal.getId())));
    }

    @PostMapping("/connections/{id}/approve")
    @PreAuthorize("hasRole('PARENT')")
    public ResponseEntity<ApiResponse<Void>> approveConnection(
            @PathVariable UUID id,
            @CurrentUser UserPrincipal principal) {
        patientService.approveConnection(principal.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Uzman isteği onaylandı", null));
    }

    @PostMapping("/connections/{id}/reject")
    @PreAuthorize("hasRole('PARENT')")
    public ResponseEntity<ApiResponse<Void>> rejectConnection(
            @PathVariable UUID id,
            @CurrentUser UserPrincipal principal) {
        patientService.rejectConnection(principal.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Uzman isteği reddedildi", null));
    }

    @PostMapping("/connections/{id}/revoke")
    @PreAuthorize("hasRole('PARENT')")
    public ResponseEntity<ApiResponse<Void>> revokeConnection(
            @PathVariable UUID id,
            @CurrentUser UserPrincipal principal) {
        patientService.revokeConnection(principal.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Uzman erişimi kaldırıldı", null));
    }

    @GetMapping("/connections/sent-requests")
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSentRequests(@CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(patientService.getSentConnectionRequestsForExpert(principal.getId())));
    }

    @PostMapping("/connections/{id}/cancel")
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<ApiResponse<Void>> cancelRequest(
            @PathVariable UUID id,
            @CurrentUser UserPrincipal principal) {
        patientService.cancelConnectionRequest(principal.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("İstek geri çekildi", null));
    }
}
