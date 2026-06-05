package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.model.SharedProgressNote;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.SharedProgressService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.autismsupport.platform.dto.SharedProgressNoteRequest;
import com.autismsupport.platform.dto.SharedProgressReplyRequest;
import com.autismsupport.platform.dto.SharedProgressStatusRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/shared-progress")
@RequiredArgsConstructor
public class SharedProgressController {

    private final SharedProgressService service;

    @GetMapping("/child/{childId}")
    public ResponseEntity<ApiResponse<List<SharedProgressNote>>> get(@PathVariable UUID childId, @CurrentUser UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.success(service.getNotes(childId, p.getId())));
    }

    @PostMapping("/child/{childId}")
    public ResponseEntity<ApiResponse<SharedProgressNote>> create(@PathVariable UUID childId,
            @Valid @RequestBody SharedProgressNoteRequest request, @CurrentUser UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.success("Not eklendi", service.createNote(childId, p.getId(), request)));
    }

    @PutMapping("/{noteId}/status")
    public ResponseEntity<ApiResponse<SharedProgressNote>> updateStatus(@PathVariable UUID noteId,
            @Valid @RequestBody SharedProgressStatusRequest request, @CurrentUser UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.success(service.updateStatus(noteId, p.getId(), request.getStatus())));
    }

    @PostMapping("/{noteId}/replies")
    public ResponseEntity<ApiResponse<SharedProgressNote>> addReply(@PathVariable UUID noteId,
            @Valid @RequestBody SharedProgressReplyRequest request, @CurrentUser UserPrincipal p) throws Exception {
        return ResponseEntity.ok(ApiResponse.success("Yanit eklendi",
                service.addReply(noteId, p.getId(), request.getFromRole(), request.getFromName(), request.getContent())));
    }

    @PutMapping("/{noteId}")
    public ResponseEntity<ApiResponse<SharedProgressNote>> update(@PathVariable UUID noteId,
            @Valid @RequestBody SharedProgressNoteRequest request, @CurrentUser UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.success(service.updateNote(noteId, p.getId(), request)));
    }

    @DeleteMapping("/{noteId}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID noteId, @CurrentUser UserPrincipal p) {
        service.deleteNote(noteId, p.getId());
        return ResponseEntity.ok(ApiResponse.success("Silindi", null));
    }

    /** Son 8 haftanin haftalik tamamlanma trendi */
    @GetMapping("/child/{childId}/trend")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTrend(@PathVariable UUID childId, @CurrentUser UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.success(service.getTrend(childId, p.getId())));
    }
}
