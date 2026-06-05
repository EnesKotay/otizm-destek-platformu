package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.MoodEntryDto;
import com.autismsupport.platform.model.Child;
import com.autismsupport.platform.model.MoodEntry;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.MoodEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MoodEntryService {

    private final MoodEntryRepository moodEntryRepository;
    private final ChildRepository childRepository;

    public List<MoodEntryDto> getEntries(UUID childId, UUID parentId) {
        validateOwnership(childId, parentId);
        return moodEntryRepository.findByChildIdOrderByEntryDateDesc(childId)
                .stream().map(this::toDto).toList();
    }

    public List<MoodEntryDto> getEntriesRange(UUID childId, LocalDate from, LocalDate to, UUID parentId) {
        validateOwnership(childId, parentId);
        return moodEntryRepository.findByChildIdAndEntryDateBetweenOrderByEntryDateAsc(childId, from, to)
                .stream().map(this::toDto).toList();
    }

    @Transactional
    public MoodEntryDto upsert(MoodEntryDto dto, UUID parentId) {
        Child child = getChildAndValidate(dto.getChildId(), parentId);
        LocalDate date = dto.getEntryDate() != null ? dto.getEntryDate() : LocalDate.now();
        var existing = moodEntryRepository.findByChildIdAndEntryDate(child.getId(), date);
        MoodEntry entry = existing.orElseGet(() -> MoodEntry.builder().child(child).entryDate(date).build());
        entry.setMoodLevel(dto.getMoodLevel());
        entry.setNotes(dto.getNotes());
        entry.setTriggers(dto.getTriggers());
        return toDto(moodEntryRepository.save(entry));
    }

    @Transactional
    public void delete(UUID id, UUID parentId) {
        MoodEntry entry = moodEntryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ruh hali kaydi bulunamadi"));
        validateOwnership(entry.getChild().getId(), parentId);
        moodEntryRepository.delete(entry);
    }

    private void validateOwnership(UUID childId, UUID parentId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new RuntimeException("Cocuk bulunamadi"));
        if (!child.getParent().getId().equals(parentId)) throw new RuntimeException("Erisim yetkisi yok");
    }

    private Child getChildAndValidate(UUID childId, UUID parentId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new RuntimeException("Cocuk bulunamadi"));
        if (!child.getParent().getId().equals(parentId)) throw new RuntimeException("Erisim yetkisi yok");
        return child;
    }

    private MoodEntryDto toDto(MoodEntry e) {
        return MoodEntryDto.builder()
                .id(e.getId()).childId(e.getChild().getId()).entryDate(e.getEntryDate())
                .moodLevel(e.getMoodLevel()).notes(e.getNotes()).triggers(e.getTriggers())
                .createdAt(e.getCreatedAt()).build();
    }
}
