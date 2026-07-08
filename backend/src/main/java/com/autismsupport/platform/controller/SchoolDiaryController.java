package com.autismsupport.platform.controller;

import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.model.SchoolDiaryEntry;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.SchoolDiaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import com.autismsupport.platform.dto.SchoolDiaryEntryRequest;
import com.autismsupport.platform.dto.SchoolDiaryReplyRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/school-diary")
@RequiredArgsConstructor
public class SchoolDiaryController {

    private final SchoolDiaryService service;

    @GetMapping("/child/{childId}")
    public ResponseEntity<ApiResponse<List<SchoolDiaryEntry>>> get(@PathVariable UUID childId, @CurrentUser UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.success(service.getEntries(childId, p.getId())));
    }

    @PostMapping("/child/{childId}")
    public ResponseEntity<ApiResponse<SchoolDiaryEntry>> create(@PathVariable UUID childId,
            @Valid @RequestBody SchoolDiaryEntryRequest request, @CurrentUser UserPrincipal p) {
        return ResponseEntity.ok(ApiResponse.success("Eklendi", service.createEntry(childId, p.getId(), request)));
    }

    @PostMapping("/{entryId}/replies")
    public ResponseEntity<ApiResponse<SchoolDiaryEntry>> addReply(@PathVariable UUID entryId,
            @Valid @RequestBody SchoolDiaryReplyRequest request, @CurrentUser UserPrincipal p) throws Exception {
        return ResponseEntity.ok(ApiResponse.success("Yanit eklendi", service.addReply(entryId, p.getId(), request)));
    }

    @DeleteMapping("/{entryId}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID entryId, @CurrentUser UserPrincipal p) {
        service.deleteEntry(entryId, p.getId());
        return ResponseEntity.ok(ApiResponse.success("Silindi", null));
    }
}
