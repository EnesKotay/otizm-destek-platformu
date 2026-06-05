package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.SleepEntryDto;
import com.autismsupport.platform.model.Child;
import com.autismsupport.platform.model.SleepEntry;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.SleepEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SleepEntryService {

    private final SleepEntryRepository sleepEntryRepository;
    private final ChildRepository childRepository;

    public List<SleepEntryDto> getEntries(UUID childId, UUID parentId) {
        validateOwnership(childId, parentId);
        return sleepEntryRepository.findByChildIdOrderBySleepDateDesc(childId)
                .stream().map(this::toDto).toList();
    }

    public List<SleepEntryDto> getEntriesRange(UUID childId, LocalDate from, LocalDate to, UUID parentId) {
        validateOwnership(childId, parentId);
        return sleepEntryRepository.findByChildIdAndSleepDateBetweenOrderBySleepDateAsc(childId, from, to)
                .stream().map(this::toDto).toList();
    }

    @Transactional
    public SleepEntryDto upsert(SleepEntryDto dto, UUID parentId) {
        Child child = getChildAndValidate(dto.getChildId(), parentId);
        LocalDate date = dto.getSleepDate() != null ? dto.getSleepDate() : LocalDate.now();
        var existing = sleepEntryRepository.findByChildIdAndSleepDate(child.getId(), date);
        SleepEntry entry = existing.orElseGet(() -> SleepEntry.builder().child(child).sleepDate(date).build());
        entry.setBedtime(dto.getBedtime());
        entry.setWakeTime(dto.getWakeTime());
        entry.setDurationMinutes(calcDuration(dto.getBedtime(), dto.getWakeTime()));
        entry.setQuality(dto.getQuality());
        entry.setNightWakings(dto.getNightWakings());
        entry.setNotes(dto.getNotes());
        return toDto(sleepEntryRepository.save(entry));
    }

    @Transactional
    public void delete(UUID id, UUID parentId) {
        SleepEntry entry = sleepEntryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Uyku kaydi bulunamadi"));
        validateOwnership(entry.getChild().getId(), parentId);
        sleepEntryRepository.delete(entry);
    }

    private Integer calcDuration(String bedtime, String wakeTime) {
        if (bedtime == null || wakeTime == null) return null;
        try {
            String[] b = bedtime.split(":"), w = wakeTime.split(":");
            int bMin = Integer.parseInt(b[0]) * 60 + Integer.parseInt(b[1]);
            int wMin = Integer.parseInt(w[0]) * 60 + Integer.parseInt(w[1]);
            int diff = wMin - bMin;
            return diff < 0 ? diff + 1440 : diff;
        } catch (Exception e) { return null; }
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

    private SleepEntryDto toDto(SleepEntry e) {
        return SleepEntryDto.builder()
                .id(e.getId()).childId(e.getChild().getId()).sleepDate(e.getSleepDate())
                .bedtime(e.getBedtime()).wakeTime(e.getWakeTime())
                .durationMinutes(e.getDurationMinutes()).quality(e.getQuality())
                .nightWakings(e.getNightWakings()).notes(e.getNotes())
                .createdAt(e.getCreatedAt()).build();
    }
}
