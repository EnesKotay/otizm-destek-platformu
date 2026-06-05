package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.ChildDto;
import com.autismsupport.platform.model.Child;
import com.autismsupport.platform.model.User;
import com.autismsupport.platform.model.UserRole;
import com.autismsupport.platform.repository.AppointmentRepository;
import com.autismsupport.platform.repository.ChildRepository;
import com.autismsupport.platform.repository.ExpertTaskRepository;
import com.autismsupport.platform.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ChildService unit testleri")
class ChildServiceTest {

    @Mock ChildRepository childRepository;
    @Mock UserRepository userRepository;
    @Mock TagService tagService;
    @Mock AppointmentRepository appointmentRepository;
    @Mock ExpertTaskRepository expertTaskRepository;

    @InjectMocks ChildService childService;

    private UUID parentId;
    private UUID childId;
    private User parent;
    private Child child;

    @BeforeEach
    void setUp() {
        parentId = UUID.randomUUID();
        childId = UUID.randomUUID();

        parent = User.builder()
                .id(parentId)
                .email("parent@example.com")
                .fullName("Test Ebeveyn")
                .role(UserRole.PARENT)
                .kvkkConsent(true)
                .verified(true)
                .build();

        child = Child.builder()
                .id(childId)
                .name("Test Çocuk")
                .parent(parent)
                .build();
    }

    @Test
    @DisplayName("getChildrenByParent: sadece o ebeveyne ait çocuklar döner")
    void getChildrenByParent_returnsOnlyOwnChildren() {
        when(childRepository.findByParentId(parentId)).thenReturn(List.of(child));

        List<ChildDto> result = childService.getChildrenByParent(parentId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Test Çocuk");
    }

    @Test
    @DisplayName("getChild: başka ebeveyne ait çocuğa erişim engellenir")
    void getChild_wrongParent_throwsException() {
        UUID otherParentId = UUID.randomUUID();
        when(childRepository.findById(childId)).thenReturn(Optional.of(child));

        assertThatThrownBy(() -> childService.getChild(childId, otherParentId))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    @DisplayName("getChild: doğru ebeveyn kendi çocuğuna erişebilir")
    void getChild_correctParent_returnsChild() {
        when(childRepository.findById(childId)).thenReturn(Optional.of(child));

        ChildDto result = childService.getChild(childId, parentId);

        assertThat(result.getName()).isEqualTo("Test Çocuk");
    }

    @Test
    @DisplayName("createChild: geçerli istekle çocuk kaydedilir")
    void createChild_validRequest_savesChild() {
        ChildDto dto = new ChildDto();
        dto.setName("Yeni Çocuk");

        when(userRepository.findById(parentId)).thenReturn(Optional.of(parent));
        when(childRepository.save(any())).thenReturn(
                Child.builder().id(UUID.randomUUID()).name("Yeni Çocuk").parent(parent).build()
        );

        ChildDto result = childService.createChild(dto, parentId);

        assertThat(result.getName()).isEqualTo("Yeni Çocuk");
        verify(childRepository).save(any());
    }

    @Test
    @DisplayName("createChild: var olmayan ebeveyn ile hata fırlatır")
    void createChild_unknownParent_throwsException() {
        ChildDto dto = new ChildDto();
        dto.setName("Çocuk");
        when(userRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> childService.createChild(dto, parentId))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Kullanıcı bulunamadı");
    }

    @Test
    @DisplayName("deleteChild: var olmayan çocuk silinmek istenirse hata fırlatır")
    void deleteChild_notFound_throwsException() {
        when(childRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> childService.deleteChild(UUID.randomUUID(), parentId))
                .isInstanceOf(RuntimeException.class);
    }
}
