package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.ReportDto;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.autismsupport.platform.dto.ReportStatusRequest;
import java.util.UUID;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {
    private final ReportService service;

    @PostMapping
    public ResponseEntity<ApiResponse<ReportDto>> create(
            @Valid @RequestBody ReportDto dto,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Sikayetiniz alindi", service.createReport(dto, principal.getId())));
    }

    @PostMapping("/expert/{expertId}")
    public ResponseEntity<ApiResponse<ReportDto>> createExpertReport(
            @PathVariable UUID expertId,
            @Valid @RequestBody ReportDto dto,
            @CurrentUser UserPrincipal principal) {
        dto.setTargetType("EXPERT");
        dto.setTargetId(expertId);
        return ResponseEntity.ok(ApiResponse.success("Sikayetiniz alindi", service.createReport(dto, principal.getId())));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ReportDto>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status) {
        if (status != null) {
            return ResponseEntity.ok(ApiResponse.success(service.getReportsByStatus(status, PageRequest.of(page, size))));
        }
        return ResponseEntity.ok(ApiResponse.success(service.getAllReports(PageRequest.of(page, size))));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<ReportDto>> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody ReportStatusRequest request) {
        return ResponseEntity.ok(ApiResponse.success(service.updateStatus(id, request.getStatus(), request.getAdminNote())));
    }
}
