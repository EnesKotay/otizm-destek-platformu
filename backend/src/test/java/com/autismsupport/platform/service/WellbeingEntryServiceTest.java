package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.WellbeingEntryDto;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.model.UserRole;
import com.autismsupport.platform.model.WellbeingEntry;
import com.autismsupport.platform.repository.UserRepository;
import com.autismsupport.platform.repository.WellbeingEntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("WellbeingEntryService unit testleri")
class WellbeingEntryServiceTest {

    @Mock WellbeingEntryRepository wellbeingEntryRepository;
    @Mock UserRepository userRepository;

    @InjectMocks WellbeingEntryService wellbeingEntryService;

    private UUID userId;
    private User user;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user = User.builder()
                .id(userId)
                .email("parent@example.com")
                .role(UserRole.PARENT)
                .kvkkConsent(true)
                .verified(true)
                .build();
    }

    @Test
    @DisplayName("getAll: kullanıcının tüm refah kayıtları döner")
    void getAll_returnsAllEntriesForUser() {
        WellbeingEntry e1 = WellbeingEntry.builder()
                .id(UUID.randomUUID()).user(user)
                .entryDate(LocalDate.of(2026, 6, 1))
                .answers(List.of(7, 6, 5, 8, 7)).score(66).build();
        WellbeingEntry e2 = WellbeingEntry.builder()
                .id(UUID.randomUUID()).user(user)
                .entryDate(LocalDate.of(2026, 5, 25))
                .answers(List.of(5, 4, 4, 5, 5)).score(46).build();

        when(wellbeingEntryRepository.findByUserIdOrderByEntryDateDesc(userId))
                .thenReturn(List.of(e1, e2));

        List<WellbeingEntryDto> result = wellbeingEntryService.getAll(userId);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getScore()).isEqualTo(66);
    }

    @Test
    @DisplayName("upsert: aynı tarihte kayıt varsa günceller (iki kez insert yok)")
    void upsert_sameDate_updatesExisting() {
        LocalDate today = LocalDate.now();
        WellbeingEntry existing = WellbeingEntry.builder()
                .id(UUID.randomUUID()).user(user)
                .entryDate(today).answers(List.of(5, 5, 5, 5, 5)).score(50).build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(wellbeingEntryRepository.findByUserIdAndEntryDate(userId, today))
                .thenReturn(Optional.of(existing));

        WellbeingEntryDto dto = WellbeingEntryDto.builder()
                .entryDate(today).answers(List.of(8, 7, 6, 9, 8)).score(76).build();

        WellbeingEntry updated = WellbeingEntry.builder()
                .id(existing.getId()).user(user)
                .entryDate(today).answers(dto.getAnswers()).score(76).build();
        when(wellbeingEntryRepository.save(any())).thenReturn(updated);

        WellbeingEntryDto result = wellbeingEntryService.upsert(dto, userId);

        assertThat(result.getScore()).isEqualTo(76);
        verify(wellbeingEntryRepository, times(1)).save(any());
    }

    @Test
    @DisplayName("upsert: yeni tarih için yeni kayıt oluşturur")
    void upsert_newDate_createsNewEntry() {
        LocalDate newDate = LocalDate.of(2026, 6, 10);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(wellbeingEntryRepository.findByUserIdAndEntryDate(userId, newDate))
                .thenReturn(Optional.empty());

        WellbeingEntryDto dto = WellbeingEntryDto.builder()
                .entryDate(newDate).answers(List.of(7, 6, 7, 8, 7)).score(70).build();

        WellbeingEntry saved = WellbeingEntry.builder()
                .id(UUID.randomUUID()).user(user)
                .entryDate(newDate).answers(dto.getAnswers()).score(70).build();
        when(wellbeingEntryRepository.save(any())).thenReturn(saved);

        WellbeingEntryDto result = wellbeingEntryService.upsert(dto, userId);

        assertThat(result.getScore()).isEqualTo(70);
    }

    @Test
    @DisplayName("delete: başka kullanıcının kaydı silinemez")
    void delete_wrongUser_throwsException() {
        UUID otherUserId = UUID.randomUUID();
        User otherUser = User.builder().id(otherUserId).role(UserRole.PARENT).kvkkConsent(true).verified(true).build();

        WellbeingEntry entry = WellbeingEntry.builder()
                .id(UUID.randomUUID()).user(otherUser)
                .entryDate(LocalDate.now()).score(50).build();

        when(wellbeingEntryRepository.findById(entry.getId())).thenReturn(Optional.of(entry));

        assertThatThrownBy(() -> wellbeingEntryService.delete(entry.getId(), userId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Erişim yetkisi yok");

        verify(wellbeingEntryRepository, never()).delete(any());
    }

    @Test
    @DisplayName("delete: kayıt bulunamazsa hata fırlatır")
    void delete_notFound_throwsException() {
        UUID unknownId = UUID.randomUUID();
        when(wellbeingEntryRepository.findById(unknownId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> wellbeingEntryService.delete(unknownId, userId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("bulunamadı");
    }
}
