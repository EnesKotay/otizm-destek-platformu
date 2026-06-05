package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.WellbeingEntryDto;
import com.autismsupport.platform.exception.ResourceNotFoundException;
import com.autismsupport.platform.exception.UnauthorizedException;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.model.WellbeingEntry;
import com.autismsupport.platform.repository.UserRepository;
import com.autismsupport.platform.repository.WellbeingEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WellbeingEntryService {

    private final WellbeingEntryRepository wellbeingEntryRepository;
    private final UserRepository userRepository;

    public List<WellbeingEntryDto> getAll(UUID userId) {
        return wellbeingEntryRepository.findByUserIdOrderByEntryDateDesc(userId)
                .stream().map(this::toDto).toList();
    }

    @Transactional
    public WellbeingEntryDto upsert(WellbeingEntryDto dto, UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));
        LocalDate date = dto.getEntryDate() != null ? dto.getEntryDate() : LocalDate.now();
        var existing = wellbeingEntryRepository.findByUserIdAndEntryDate(userId, date);
        WellbeingEntry entry = existing.orElseGet(() ->
                WellbeingEntry.builder().user(user).entryDate(date).build());
        entry.setAnswers(dto.getAnswers());
        entry.setScore(dto.getScore());
        entry.setNotes(dto.getNotes());
        return toDto(wellbeingEntryRepository.save(entry));
    }

    @Transactional
    public void delete(UUID id, UUID userId) {
        WellbeingEntry entry = wellbeingEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Refah kaydı bulunamadı"));
        if (!entry.getUser().getId().equals(userId)) {
            throw new UnauthorizedException("Erişim yetkisi yok: bu refah kaydına erişim yetkiniz yok");
        }
        wellbeingEntryRepository.delete(entry);
    }

    private WellbeingEntryDto toDto(WellbeingEntry e) {
        return WellbeingEntryDto.builder()
                .id(e.getId()).entryDate(e.getEntryDate())
                .answers(e.getAnswers()).score(e.getScore())
                .notes(e.getNotes()).createdAt(e.getCreatedAt())
                .build();
    }
}
