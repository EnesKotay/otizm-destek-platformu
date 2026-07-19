package com.autismsupport.platform.controller;

import com.autismsupport.platform.config.RateLimit;
import com.autismsupport.platform.dto.ApiResponse;
import com.autismsupport.platform.exception.ResourceNotFoundException;
import com.autismsupport.platform.exception.UnauthorizedException;
import com.autismsupport.platform.model.StoredFile;
import com.autismsupport.platform.repository.StoredFileRepository;
import com.autismsupport.platform.security.CurrentUser;
import com.autismsupport.platform.security.UserPrincipal;
import com.autismsupport.platform.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
public class FileUploadController {
    private final FileStorageService storageService;
    private final StoredFileRepository storedFileRepository;
    private final com.autismsupport.platform.repository.ConversationRepository conversationRepository;
    private final com.autismsupport.platform.repository.ChildRepository childRepository;
    private final com.autismsupport.platform.service.ClinicalDataShareService clinicalDataShareService;

    @RateLimit(limit = 30, duration = 60)
    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, String>>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "PRIVATE") StoredFile.Visibility visibility,
            @RequestParam(required = false) StoredFile.ScopeType scopeType,
            @RequestParam(required = false) UUID scopeId,
            @CurrentUser UserPrincipal principal) {
        validateScopeForUpload(scopeType, scopeId, principal.getId());
        String filename = storageService.store(file);
        try {
            storedFileRepository.save(StoredFile.builder()
                    .filename(filename)
                    .ownerId(principal.getId())
                    .originalFilename(file.getOriginalFilename())
                    .contentType(file.getContentType())
                    .size(file.getSize())
                    .visibility(visibility)
                    .scopeType(scopeType)
                    .scopeId(scopeId)
                    .build());
        } catch (RuntimeException exception) {
            storageService.delete(filename);
            throw exception;
        }
        String url = "/api/upload/" + filename;
        return ResponseEntity.ok(ApiResponse.success(Map.of("url", url, "filename", filename)));
    }

    @GetMapping("/{filename:.+}")
    public ResponseEntity<Resource> serveFile(@PathVariable String filename,
                                               @CurrentUser UserPrincipal principal) {
        StoredFile metadata = storedFileRepository.findById(filename)
                .orElseThrow(() -> new ResourceNotFoundException("Dosya bulunamadı"));
        if (!mayRead(metadata, principal.getId())) {
            throw new UnauthorizedException("Bu dosyaya erişim yetkiniz yok");
        }
        try {
            Resource resource = storageService.loadResource(filename);
            if (resource.exists() || resource.isReadable()) {
                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                        .contentType(resolveContentType(metadata.getContentType()))
                        .body(resource);
            }
            return ResponseEntity.notFound().build();
        } catch (ResourceNotFoundException | UnauthorizedException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    private void validateScopeForUpload(StoredFile.ScopeType scopeType, UUID scopeId, UUID userId) {
        if (scopeType == null && scopeId == null) return;
        if (scopeType == null || scopeId == null) throw new com.autismsupport.platform.exception.ValidationException("Dosya kapsamı eksik");
        boolean allowed = switch (scopeType) {
            case CONVERSATION -> conversationRepository.existsByIdAndParticipantsId(scopeId, userId);
            case CHILD_PROFILE, CHILD_NOTES -> childRepository.existsByIdAndParentId(scopeId, userId);
        };
        if (!allowed) throw new UnauthorizedException("Bu kapsam için dosya yükleme yetkiniz yok");
    }

    private boolean mayRead(StoredFile file, UUID userId) {
        if (file.getOwnerId().equals(userId) || file.getVisibility() == StoredFile.Visibility.AUTHENTICATED) return true;
        if (file.getScopeType() == null || file.getScopeId() == null) return false;
        return switch (file.getScopeType()) {
            case CONVERSATION -> conversationRepository.existsByIdAndParticipantsId(file.getScopeId(), userId);
            case CHILD_PROFILE -> clinicalDataShareService.verifyAccess(userId, file.getScopeId(), "profile");
            case CHILD_NOTES -> clinicalDataShareService.verifyAccess(userId, file.getScopeId(), "notes");
        };
    }

    private MediaType resolveContentType(String contentType) {
        try {
            return contentType == null ? MediaType.APPLICATION_OCTET_STREAM : MediaType.parseMediaType(contentType);
        } catch (IllegalArgumentException e) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }
}
