package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.dto.DevelopmentNoteDto;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.DevelopmentNoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notes")
@RequiredArgsConstructor
public class DevelopmentNoteController {

    private final DevelopmentNoteService noteService;

    @GetMapping("/child/{childId}")
    public ResponseEntity<ApiResponse<Page<DevelopmentNoteDto>>> getNotes(
            @PathVariable UUID childId, @CurrentUser UserPrincipal principal, Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(noteService.getNotesByChild(childId, principal.getId(), pageable)));
    }

    @GetMapping("/child/{childId}/recent")
    public ResponseEntity<ApiResponse<List<DevelopmentNoteDto>>> getRecentNotes(
            @PathVariable UUID childId, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(noteService.getRecentNotes(childId, principal.getId())));
    }

    @GetMapping("/count")
    public ResponseEntity<ApiResponse<Long>> getTotalNotesCount(@CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success(noteService.getTotalNotesCount(principal.getId())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DevelopmentNoteDto>> createNote(
            @Valid @RequestBody DevelopmentNoteDto dto, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Not olusturuldu", noteService.createNote(dto, principal.getId())));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DevelopmentNoteDto>> updateNote(
            @PathVariable UUID id, @Valid @RequestBody DevelopmentNoteDto dto, @CurrentUser UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Not guncellendi", noteService.updateNote(id, dto, principal.getId())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteNote(@PathVariable UUID id, @CurrentUser UserPrincipal principal) {
        noteService.deleteNote(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Not silindi", null));
    }
}
