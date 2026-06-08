package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.DevelopmentNoteDto;
import com.autismsupport.platform.exception.ResourceNotFoundException;
import com.autismsupport.platform.exception.UnauthorizedException;
import com.autismsupport.platform.model.Child;
import com.autismsupport.platform.model.DevelopmentNote;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.DevelopmentNoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DevelopmentNoteService {

    private final DevelopmentNoteRepository noteRepository;
    private final ChildRepository childRepository;
    private final PatientAccessService patientAccessService;

    @Transactional(readOnly = true)
    public Page<DevelopmentNoteDto> getNotesByChild(UUID childId, UUID userId, String role, Pageable pageable) {
        validateChildReadAccess(childId, userId, role);
        return noteRepository.findByChildIdOrderByNoteDateDesc(childId, pageable)
                .map(this::toDto);
    }

    @Transactional(readOnly = true)
    public List<DevelopmentNoteDto> getRecentNotes(UUID childId, UUID userId, String role) {
        validateChildReadAccess(childId, userId, role);
        return noteRepository.findTop5ByChildIdOrderByCreatedAtDesc(childId).stream()
                .map(this::toDto)
                .toList();
    }

    public long getTotalNotesCount(UUID parentId) {
        return noteRepository.countTotalByParentId(parentId);
    }

    @Transactional
    public DevelopmentNoteDto createNote(DevelopmentNoteDto dto, UUID parentId) {
        Child child = childRepository.findById(dto.getChildId())
                .orElseThrow(() -> new RuntimeException("Çocuk profili bulunamadı"));
        validateChildOwnership(child, parentId);

        DevelopmentNote note = DevelopmentNote.builder()
                .child(child)
                .title(dto.getTitle())
                .content(dto.getContent())
                .category(dto.getCategory())
                .mood(dto.getMood())
                .noteDate(dto.getNoteDate() != null ? dto.getNoteDate() : LocalDate.now())
                .build();

        note = noteRepository.save(note);
        return toDto(note);
    }

    @Transactional
    public DevelopmentNoteDto updateNote(UUID noteId, DevelopmentNoteDto dto, UUID parentId) {
        DevelopmentNote note = noteRepository.findById(noteId)
                .orElseThrow(() -> new RuntimeException("Not bulunamadı"));
        validateChildOwnership(note.getChild(), parentId);

        note.setTitle(dto.getTitle());
        note.setContent(dto.getContent());
        note.setCategory(dto.getCategory());
        note.setMood(dto.getMood());
        if (dto.getNoteDate() != null) {
            note.setNoteDate(dto.getNoteDate());
        }

        note = noteRepository.save(note);
        return toDto(note);
    }

    @Transactional
    public void deleteNote(UUID noteId, UUID parentId) {
        DevelopmentNote note = noteRepository.findById(noteId)
                .orElseThrow(() -> new RuntimeException("Not bulunamadı"));
        validateChildOwnership(note.getChild(), parentId);
        noteRepository.delete(note);
    }

    private void validateChildOwnership(UUID childId, UUID parentId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new ResourceNotFoundException("Çocuk profili bulunamadı"));
        validateChildOwnership(child, parentId);
    }

    private void validateChildReadAccess(UUID childId, UUID userId, String role) {
        childRepository.findById(childId)
                .orElseThrow(() -> new ResourceNotFoundException("Çocuk profili bulunamadı"));
        if (!patientAccessService.canReadChild(userId, role, childId)) {
            throw new UnauthorizedException("Bu çocuk profiline erişim yetkiniz yok");
        }
    }

    private void validateChildOwnership(Child child, UUID parentId) {
        if (!child.getParent().getId().equals(parentId)) {
            throw new UnauthorizedException("Bu çocuk profiline erişim yetkiniz yok");
        }
    }

    private DevelopmentNoteDto toDto(DevelopmentNote note) {
        return DevelopmentNoteDto.builder()
                .id(note.getId())
                .title(note.getTitle())
                .content(note.getContent())
                .category(note.getCategory())
                .mood(note.getMood())
                .noteDate(note.getNoteDate())
                .childId(note.getChild().getId())
                .createdAt(note.getCreatedAt())
                .build();
    }
}
