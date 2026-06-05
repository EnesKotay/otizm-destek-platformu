package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.ABCEntryDto;
import com.autismsupport.platform.model.ABCEntry;
import com.autismsupport.platform.model.Child;
import com.autismsupport.platform.repository.ABCEntryRepository;
import com.autismsupport.platform.repository.ChildRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ABCEntryService {

    private final ABCEntryRepository abcEntryRepository;
    private final ChildRepository childRepository;

    @Transactional(readOnly = true)
    public List<ABCEntryDto> getByChild(UUID childId, UUID parentId) {
        getOwnedChild(childId, parentId);
        return abcEntryRepository.findByChildIdOrderByEntryDateDescEntryTimeDescCreatedAtDesc(childId)
                .stream().map(this::toDto).toList();
    }

    @Transactional
    public ABCEntryDto create(ABCEntryDto dto, UUID parentId) {
        Child child = getOwnedChild(dto.getChildId(), parentId);
        ABCEntry entry = ABCEntry.builder()
                .child(child)
                .entryDate(dto.getEntryDate() != null ? dto.getEntryDate() : LocalDate.now())
                .entryTime(dto.getEntryTime())
                .antecedent(requireText(dto.getAntecedent(), "Oncesi"))
                .behavior(requireText(dto.getBehavior(), "Davranis"))
                .consequence(requireText(dto.getConsequence(), "Sonuc"))
                .intensity(dto.getIntensity())
                .category(blankToNull(dto.getCategory()))
                .location(blankToNull(dto.getLocation()))
                .notes(blankToNull(dto.getNotes()))
                .build();
        return toDto(abcEntryRepository.save(entry));
    }

    @Transactional
    public ABCEntryDto update(UUID id, ABCEntryDto dto, UUID parentId) {
        ABCEntry entry = abcEntryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ABC kaydi bulunamadi"));
        getOwnedChild(entry.getChild().getId(), parentId);
        entry.setEntryDate(dto.getEntryDate() != null ? dto.getEntryDate() : entry.getEntryDate());
        entry.setEntryTime(dto.getEntryTime());
        entry.setAntecedent(requireText(dto.getAntecedent(), "Oncesi"));
        entry.setBehavior(requireText(dto.getBehavior(), "Davranis"));
        entry.setConsequence(requireText(dto.getConsequence(), "Sonuc"));
        entry.setIntensity(dto.getIntensity());
        entry.setCategory(blankToNull(dto.getCategory()));
        entry.setLocation(blankToNull(dto.getLocation()));
        entry.setNotes(blankToNull(dto.getNotes()));
        return toDto(abcEntryRepository.save(entry));
    }

    @Transactional
    public void delete(UUID id, UUID parentId) {
        ABCEntry entry = abcEntryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ABC kaydi bulunamadi"));
        getOwnedChild(entry.getChild().getId(), parentId);
        abcEntryRepository.delete(entry);
    }

    private Child getOwnedChild(UUID childId, UUID parentId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new RuntimeException("Cocuk bulunamadi"));
        if (!child.getParent().getId().equals(parentId)) {
            throw new RuntimeException("Erişim yetkisi yok");
        }
        return child;
    }

    private static String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new RuntimeException(fieldName + " zorunludur");
        }
        return value.trim();
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private ABCEntryDto toDto(ABCEntry e) {
        return ABCEntryDto.builder()
                .id(e.getId()).childId(e.getChild().getId())
                .entryDate(e.getEntryDate()).entryTime(e.getEntryTime())
                .antecedent(e.getAntecedent()).behavior(e.getBehavior())
                .consequence(e.getConsequence()).intensity(e.getIntensity())
                .category(e.getCategory()).location(e.getLocation())
                .notes(e.getNotes()).createdAt(e.getCreatedAt())
                .build();
    }
}
