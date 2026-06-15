package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.ExpertConsultationDto;
import com.autismsupport.platform.dto.ExpertConsultationReplyDto;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.ExpertConsultationService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/consultations")
@RequiredArgsConstructor
public class ExpertConsultationController {

    private final ExpertConsultationService service;

    @GetMapping
    @PreAuthorize("hasRole('EXPERT') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<ExpertConsultationDto>>> list(
            @RequestParam(defaultValue = "all") String status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(service.list(status, q, page, size)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('EXPERT') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ExpertConsultationDto>> detail(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(service.getDetail(id)));
    }

    @PostMapping
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<ApiResponse<ExpertConsultationDto>> create(
            @RequestBody CreateConsultationRequest body,
            @CurrentUser UserPrincipal principal) {
        var dto = service.create(principal.getId(), body.getTitle(), body.getDescription(), body.getTags());
        return ResponseEntity.ok(ApiResponse.success("Vaka paylaşıldı", dto));
    }

    @PostMapping("/{id}/replies")
    @PreAuthorize("hasRole('EXPERT') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ExpertConsultationReplyDto>> reply(
            @PathVariable UUID id,
            @RequestBody ReplyRequest body,
            @CurrentUser UserPrincipal principal) {
        var dto = service.addReply(id, principal.getId(), body.getContent());
        return ResponseEntity.ok(ApiResponse.success("Görüş eklendi", dto));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<ApiResponse<ExpertConsultationDto>> updateStatus(
            @PathVariable UUID id,
            @RequestBody StatusRequest body,
            @CurrentUser UserPrincipal principal) {
        var dto = service.updateStatus(id, principal.getId(), body.getStatus());
        return ResponseEntity.ok(ApiResponse.success("Durum güncellendi", dto));
    }

    @Data
    static class CreateConsultationRequest {
        private String title;
        private String description;
        private List<String> tags;
    }

    @Data
    static class ReplyRequest {
        private String content;
    }

    @Data
    static class StatusRequest {
        private String status;
    }
}
