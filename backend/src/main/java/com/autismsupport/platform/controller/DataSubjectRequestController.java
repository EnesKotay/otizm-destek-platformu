package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.CreateDataSubjectRequest;
import com.autismsupport.platform.dto.DataSubjectRequestDto;
import com.autismsupport.platform.exception.ValidationException;
import com.autismsupport.platform.model.DataSubjectRequest;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.DataSubjectRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * İlgili kişinin KVKK md. 11 haklarını kullanabilmesi için başvuru ucu.
 * Aydınlatma metninde "başvurularınızı Ayarlar üzerinden iletebilirsiniz"
 * denmesine rağmen daha önce böyle bir uç yoktu.
 */
@RestController
@RequestMapping("/api/kvkk/requests")
@RequiredArgsConstructor
public class DataSubjectRequestController {

    private final DataSubjectRequestService service;

    @PostMapping
    public ResponseEntity<ApiResponse<DataSubjectRequestDto>> create(
            @Valid @RequestBody CreateDataSubjectRequest body,
            @CurrentUser UserPrincipal principal) {

        DataSubjectRequest.RequestType type;
        try {
            type = DataSubjectRequest.RequestType.valueOf(body.getRequestType().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ValidationException("Geçersiz başvuru türü: " + body.getRequestType());
        }

        DataSubjectRequest created = service.create(
                principal.getId(), type, body.getDescription(), body.getContactEmail());

        return ResponseEntity.ok(ApiResponse.success(
                "Başvurunuz alındı. En geç 30 gün içinde yanıtlanacaktır.",
                DataSubjectRequestDto.from(created)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<DataSubjectRequestDto>>> myRequests(
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(service.myRequests(principal.getId()).stream()
                .map(DataSubjectRequestDto::from)
                .toList()));
    }

    // ── Yönetici ──────────────────────────────────────────────────────────────

    @GetMapping("/admin/open")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<DataSubjectRequestDto>>> openRequests() {
        return ResponseEntity.ok(ApiResponse.success(service.openRequests().stream()
                .map(DataSubjectRequestDto::from)
                .toList()));
    }

    @PostMapping("/admin/{id}/resolve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DataSubjectRequestDto>> resolve(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @CurrentUser UserPrincipal principal) {

        DataSubjectRequest.Status status;
        try {
            status = DataSubjectRequest.Status.valueOf(
                    String.valueOf(body.get("status")).toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ValidationException("Geçersiz durum: " + body.get("status"));
        }

        DataSubjectRequest resolved = service.resolve(id, status, body.get("response"), principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Başvuru güncellendi", DataSubjectRequestDto.from(resolved)));
    }
}
