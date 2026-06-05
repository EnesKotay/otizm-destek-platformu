package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.ABCEntryDto;
import com.autismsupport.platform.model.ABCEntry;
import com.autismsupport.platform.model.Child;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.model.UserRole;
import com.autismsupport.platform.repository.ABCEntryRepository;
import com.autismsupport.platform.repository.ChildRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ABCEntryService unit testleri")
class ABCEntryServiceTest {

    @Mock ABCEntryRepository abcEntryRepository;
    @Mock ChildRepository childRepository;

    @InjectMocks ABCEntryService abcEntryService;

    private UUID parentId;
    private UUID childId;
    private User parent;
    private Child child;

    @BeforeEach
    void setUp() {
        parentId = UUID.randomUUID();
        childId = UUID.randomUUID();
        parent = User.builder().id(parentId).role(UserRole.PARENT).kvkkConsent(true).verified(true).build();
        child = Child.builder().id(childId).name("Test Çocuk").parent(parent).build();
    }

    @Test
    @DisplayName("getByChild: ownership doğrulaması çalışır")
    void getByChild_wrongParent_throwsException() {
        UUID otherId = UUID.randomUUID();
        User other = User.builder().id(otherId).role(UserRole.PARENT).kvkkConsent(true).verified(true).build();
        Child otherChild = Child.builder().id(childId).parent(other).build();
        when(childRepository.findById(childId)).thenReturn(Optional.of(otherChild));

        assertThatThrownBy(() -> abcEntryService.getByChild(childId, parentId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Erişim yetkisi yok");
    }

    @Test
    @DisplayName("create: geçerli payload ile kayıt oluşturulur")
    void create_validPayload_createsEntry() {
        when(childRepository.findById(childId)).thenReturn(Optional.of(child));

        ABCEntryDto dto = ABCEntryDto.builder()
                .childId(childId)
                .entryDate(LocalDate.now())
                .antecedent("Rutin değişti")
                .behavior("Tantrum")
                .consequence("Yönlendirme yapıldı")
                .intensity(3)
                .category("Tantrum / Ağlama")
                .location("Ev")
                .build();

        ABCEntry saved = ABCEntry.builder()
                .id(UUID.randomUUID()).child(child)
                .entryDate(LocalDate.now())
                .antecedent(dto.getAntecedent()).behavior(dto.getBehavior())
                .consequence(dto.getConsequence()).intensity(3)
                .category(dto.getCategory()).location(dto.getLocation())
                .build();
        when(abcEntryRepository.save(any())).thenReturn(saved);

        ABCEntryDto result = abcEntryService.create(dto, parentId);

        assertThat(result.getAntecedent()).isEqualTo("Rutin değişti");
        assertThat(result.getIntensity()).isEqualTo(3);
        verify(abcEntryRepository).save(any());
    }

    @Test
    @DisplayName("create: metin alanlarini normalize eder")
    void create_trimsTextFieldsAndConvertsBlankOptionalFieldsToNull() {
        when(childRepository.findById(childId)).thenReturn(Optional.of(child));
        when(abcEntryRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        ABCEntryDto dto = ABCEntryDto.builder()
                .childId(childId)
                .antecedent("  Rutin degisti  ")
                .behavior("  Tantrum  ")
                .consequence("  Yonlendirme yapildi  ")
                .intensity(3)
                .category("   ")
                .location(" Ev ")
                .notes("")
                .build();

        ABCEntryDto result = abcEntryService.create(dto, parentId);

        assertThat(result.getAntecedent()).isEqualTo("Rutin degisti");
        assertThat(result.getBehavior()).isEqualTo("Tantrum");
        assertThat(result.getConsequence()).isEqualTo("Yonlendirme yapildi");
        assertThat(result.getCategory()).isNull();
        assertThat(result.getLocation()).isEqualTo("Ev");
        assertThat(result.getNotes()).isNull();
    }

    @Test
    @DisplayName("delete: kayıt sahibi başarıyla silebilir")
    void delete_byOwner_deletesEntry() {
        ABCEntry entry = ABCEntry.builder()
                .id(UUID.randomUUID()).child(child).entryDate(LocalDate.now())
                .antecedent("A").behavior("B").consequence("C").intensity(2)
                .category("Diğer").location("Ev").build();

        when(abcEntryRepository.findById(entry.getId())).thenReturn(Optional.of(entry));
        when(childRepository.findById(childId)).thenReturn(Optional.of(child));

        abcEntryService.delete(entry.getId(), parentId);

        verify(abcEntryRepository).delete(entry);
    }

    @Test
    @DisplayName("delete: başka ebeveyn silemez")
    void delete_wrongParent_throwsException() {
        UUID otherParentId = UUID.randomUUID();
        User other = User.builder().id(otherParentId).role(UserRole.PARENT).kvkkConsent(true).verified(true).build();
        Child otherChild = Child.builder().id(UUID.randomUUID()).parent(other).build();
        ABCEntry entry = ABCEntry.builder()
                .id(UUID.randomUUID()).child(otherChild).entryDate(LocalDate.now())
                .antecedent("A").behavior("B").consequence("C").intensity(1)
                .category("Diğer").location("Ev").build();

        when(abcEntryRepository.findById(entry.getId())).thenReturn(Optional.of(entry));
        when(childRepository.findById(otherChild.getId())).thenReturn(Optional.of(otherChild));

        assertThatThrownBy(() -> abcEntryService.delete(entry.getId(), parentId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Erişim yetkisi yok");

        verify(abcEntryRepository, never()).delete(any());
    }
}
