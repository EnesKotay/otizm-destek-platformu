package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.PatientNoteDto;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.PatientNoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/patient-notes")
@RequiredArgsConstructor
public class PatientNoteController {

    private final PatientNoteService patientNoteService;

    @GetMapping
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<ApiResponse<List<PatientNoteDto>>> getNotes(
            @RequestParam UUID parentId,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                patientNoteService.getNotes(principal.getId(), parentId)));
    }

    @PostMapping
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<ApiResponse<PatientNoteDto>> createNote(
            @Valid @RequestBody PatientNoteDto dto,
            @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(
                "Not kaydedildi",
                patientNoteService.createNote(principal.getId(), dto)));
    }

    @DeleteMapping("/{noteId}")
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<ApiResponse<Void>> deleteNote(
            @PathVariable UUID noteId,
            @CurrentUser UserPrincipal principal) {
        patientNoteService.deleteNote(noteId, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Not silindi", null));
    }
}
