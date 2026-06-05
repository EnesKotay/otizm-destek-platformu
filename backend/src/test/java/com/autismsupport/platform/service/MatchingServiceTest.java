package com.autismsupport.platform.service;

import com.autismsupport.platform.model.Child;
import com.autismsupport.platform.model.Tag;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.repository.BuddyRelationshipRepository;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MatchingService unit testleri")
class MatchingServiceTest {

    @Mock ChildRepository childRepository;
    @Mock UserRepository userRepository;
    @Mock BuddyRelationshipRepository buddyRelationshipRepository;
    @Mock TagService tagService;

    @InjectMocks MatchingService matchingService;

    // ── findSimilarFamilies — güvenlik ────────────────────────────────────────

    @Test
    @DisplayName("findSimilarFamilies: başka bir ebeveynin çocuğuyla sorgu yapılırsa exception fırlatır")
    void findSimilarFamilies_wrongParent_throws() {
        UUID childId   = UUID.randomUUID();
        UUID realOwner = UUID.randomUUID();
        UUID attacker  = UUID.randomUUID();

        User owner = User.builder().id(realOwner).build();
        Child child = Child.builder().id(childId).parent(owner).build();

        when(childRepository.findById(childId)).thenReturn(Optional.of(child));

        assertThatThrownBy(() -> matchingService.findSimilarFamilies(childId, attacker, 0.3, null, "score"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("yetkiniz yok");
    }

    @Test
    @DisplayName("findSimilarFamilies: çocuğun tag'i yoksa boş liste döner")
    void findSimilarFamilies_noTags_returnsEmpty() {
        UUID parentId = UUID.randomUUID();
        UUID childId  = UUID.randomUUID();
        User parent = User.builder().id(parentId).build();
        Child child = Child.builder().id(childId).parent(parent).tags(Set.of()).build();

        when(childRepository.findById(childId)).thenReturn(Optional.of(child));

        var result = matchingService.findSimilarFamilies(childId, parentId, 0.3, null, "score");

        assertThat(result).isEmpty();
        verify(childRepository, never()).findAllWithTagsAndParentForMatching();
    }

    @Test
    @DisplayName("findSimilarFamilies: kendi çocuğunu liste dışında tutar")
    void findSimilarFamilies_excludesSelf() {
        UUID parentId = UUID.randomUUID();
        UUID childId  = UUID.randomUUID();
        Tag tag = Tag.builder().id(UUID.randomUUID()).name("ABA").category("terapi").build();
        User parent = User.builder().id(parentId).build();
        Child myChild = Child.builder().id(childId).parent(parent)
                .tags(Set.of(tag)).birthDate(LocalDate.of(2018, 1, 1)).build();

        when(childRepository.findById(childId)).thenReturn(Optional.of(myChild));
        when(childRepository.findAllWithTagsAndParentForMatching()).thenReturn(List.of(myChild));

        var result = matchingService.findSimilarFamilies(childId, parentId, 0.0, null, "score");

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("findSimilarFamilies: benzer tag'li farklı aile eşleşir")
    void findSimilarFamilies_matchesFamily() {
        UUID parentId  = UUID.randomUUID();
        UUID otherPId  = UUID.randomUUID();
        UUID childId   = UUID.randomUUID();
        UUID otherCId  = UUID.randomUUID();
        Tag tag = Tag.builder().id(UUID.randomUUID()).name("PECS").category("terapi").build();

        User parent  = User.builder().id(parentId).fullName("Anne").build();
        User other   = User.builder().id(otherPId).fullName("Baba").matchingEnabled(true).build();
        Child myChild    = Child.builder().id(childId).parent(parent)
                .tags(Set.of(tag)).birthDate(LocalDate.of(2018, 1, 1)).build();
        Child otherChild = Child.builder().id(otherCId).parent(other)
                .tags(Set.of(tag)).birthDate(LocalDate.of(2018, 6, 1)).build();

        when(childRepository.findById(childId)).thenReturn(Optional.of(myChild));
        when(childRepository.findAllWithTagsAndParentForMatching()).thenReturn(List.of(myChild, otherChild));
        when(buddyRelationshipRepository.findBetweenUsers(any(), any())).thenReturn(Optional.empty());
        when(tagService.toDto(tag)).thenReturn(
                com.autismsupport.platform.dto.TagDto.builder().id(tag.getId()).name(tag.getName()).build());

        var result = matchingService.findSimilarFamilies(childId, parentId, 0.0, null, "score");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getParentId()).isEqualTo(otherPId);
        assertThat(result.get(0).getSimilarityScore()).isGreaterThan(0);
    }

    // ── isMatchingEnabled ─────────────────────────────────────────────────────

    @Test
    @DisplayName("isMatchingEnabled: kullanıcı bulunamazsa exception fırlatır")
    void isMatchingEnabled_userNotFound_throws() {
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> matchingService.isMatchingEnabled(userId))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    @DisplayName("isMatchingEnabled: kullanıcının matchingEnabled değerini döner")
    void isMatchingEnabled_returnsUserFlag() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().id(userId).matchingEnabled(true).build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertThat(matchingService.isMatchingEnabled(userId)).isTrue();
    }
}
