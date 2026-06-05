package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.PatientNoteDto;
import com.autismsupport.platform.model.Child;
import com.autismsupport.platform.model.PatientNote;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.PatientNoteRepository;
import com.autismsupport.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PatientNoteService {

    private final PatientNoteRepository patientNoteRepository;
    private final UserRepository userRepository;
    private final ChildRepository childRepository;

    public List<PatientNoteDto> getNotes(UUID expertId, UUID parentId) {
        return patientNoteRepository.findByExpertIdAndParentId(expertId, parentId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional
    public PatientNoteDto createNote(UUID expertId, PatientNoteDto dto) {
        User expert = userRepository.findById(expertId)
                .orElseThrow(() -> new RuntimeException("Uzman bulunamadi"));
        User parent = userRepository.findById(dto.getParentId())
                .orElseThrow(() -> new RuntimeException("Ebeveyn bulunamadi"));

        Child child = null;
        if (dto.getChildId() != null) {
            child = childRepository.findById(dto.getChildId())
                    .orElseThrow(() -> new RuntimeException("Cocuk bulunamadi"));
        }

        PatientNote note = PatientNote.builder()
                .expert(expert)
                .parent(parent)
                .child(child)
                .content(dto.getContent())
                .category(dto.getCategory() != null ? dto.getCategory() : "GENERAL")
                .noteDate(dto.getNoteDate())
                .build();

        return toDto(patientNoteRepository.save(note));
    }

    @Transactional
    public void deleteNote(UUID noteId, UUID expertId) {
        PatientNote note = patientNoteRepository.findById(noteId)
                .orElseThrow(() -> new RuntimeException("Not bulunamadi"));
        if (!note.getExpert().getId().equals(expertId)) {
            throw new AccessDeniedException("Bu notu silme yetkiniz yok");
        }
        patientNoteRepository.delete(note);
    }

    private PatientNoteDto toDto(PatientNote note) {
        return PatientNoteDto.builder()
                .id(note.getId())
                .expertId(note.getExpert().getId())
                .parentId(note.getParent().getId())
                .parentName(note.getParent().getFullName())
                .childId(note.getChild() != null ? note.getChild().getId() : null)
                .childName(note.getChild() != null ? note.getChild().getName() : null)
                .content(note.getContent())
                .category(note.getCategory())
                .noteDate(note.getNoteDate())
                .createdAt(note.getCreatedAt())
                .updatedAt(note.getUpdatedAt())
                .build();
    }
}
