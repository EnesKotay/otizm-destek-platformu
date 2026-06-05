package com.autismsupport.platform.service;

import com.autismsupport.platform.dto.AppointmentDto;
import com.autismsupport.platform.dto.ExpertAvailabilityDto;
import com.autismsupport.platform.model.*;
import com.autismsupport.platform.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AppointmentService unit testleri")
class AppointmentServiceTest {

    @Mock AppointmentRepository appointmentRepository;
    @Mock UserRepository userRepository;
    @Mock ChildRepository childRepository;
    @Mock ExpertAvailabilityRepository availabilityRepository;
    @Mock CalendarEventRepository calendarEventRepository;
    @Mock NotificationService notificationService;
    @Mock AuditLogService auditLogService;

    @InjectMocks AppointmentService appointmentService;

    private UUID parentId;
    private UUID expertId;
    private UUID childId;
    private User parent;
    private User expert;
    private Child child;
    private ExpertAvailability availability;

    @BeforeEach
    void setUp() {
        parentId = UUID.randomUUID();
        expertId = UUID.randomUUID();
        childId = UUID.randomUUID();

        parent = User.builder().id(parentId).email("parent@example.com").role(UserRole.PARENT).build();
        expert = User.builder().id(expertId).email("expert@example.com").role(UserRole.EXPERT).verified(true).build();
        child = Child.builder().id(childId).name("Test Çocuk").parent(parent).build();

        availability = ExpertAvailability.builder()
                .id(UUID.randomUUID())
                .expert(expert)
                .dayOfWeek(LocalDate.now().plusDays(1).getDayOfWeek().getValue())
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(17, 0))
                .enabled(true)
                .build();
    }

    @Test
    @DisplayName("createAppointment: çakışma varsa hata fırlatır")
    void createAppointment_conflictExists_throwsException() {
        LocalDate date = LocalDate.now().plusDays(1);
        AppointmentDto dto = AppointmentDto.builder()
                .expertId(expertId)
                .childId(childId)
                .date(date)
                .time("10:00")
                .duration(50)
                .type("ONLINE")
                .notes("Kriz analizi")
                .build();

        when(userRepository.findById(parentId)).thenReturn(Optional.of(parent));
        when(userRepository.findById(expertId)).thenReturn(Optional.of(expert));
        when(childRepository.findById(childId)).thenReturn(Optional.of(child));
        when(availabilityRepository.findByExpertIdAndDayOfWeek(eq(expertId), anyInt())).thenReturn(Optional.of(availability));
        
        Appointment existing = Appointment.builder()
                .id(UUID.randomUUID())
                .expert(expert)
                .appointmentDate(date)
                .appointmentTime(LocalTime.of(10, 0))
                .duration(50)
                .status("PENDING")
                .build();
        when(appointmentRepository.findByExpertIdAndAppointmentDateOrderByAppointmentTimeAsc(expertId, date))
                .thenReturn(List.of(existing));

        assertThatThrownBy(() -> appointmentService.createAppointment(parentId, dto))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Seçilen saat dolu");

        verify(appointmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("createAppointment: çakışma yoksa randevu oluşturur")
    void createAppointment_noConflict_createsSuccessfully() {
        LocalDate date = LocalDate.now().plusDays(1);
        AppointmentDto dto = AppointmentDto.builder()
                .expertId(expertId)
                .childId(childId)
                .date(date)
                .time("10:00")
                .duration(50)
                .type("ONLINE")
                .notes("Kriz analizi")
                .build();

        when(userRepository.findById(parentId)).thenReturn(Optional.of(parent));
        when(userRepository.findById(expertId)).thenReturn(Optional.of(expert));
        when(childRepository.findById(childId)).thenReturn(Optional.of(child));
        when(availabilityRepository.findByExpertIdAndDayOfWeek(eq(expertId), anyInt())).thenReturn(Optional.of(availability));
        
        when(appointmentRepository.findByExpertIdAndAppointmentDateOrderByAppointmentTimeAsc(expertId, date))
                .thenReturn(Collections.emptyList());

        Appointment saved = Appointment.builder()
                .id(UUID.randomUUID())
                .parent(parent)
                .expert(expert)
                .child(child)
                .appointmentDate(date)
                .appointmentTime(LocalTime.of(10, 0))
                .duration(50)
                .status("PENDING")
                .type("ONLINE")
                .build();

        when(appointmentRepository.save(any(Appointment.class))).thenReturn(saved);

        AppointmentDto result = appointmentService.createAppointment(parentId, dto);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo("PENDING");
        verify(appointmentRepository).save(any(Appointment.class));
    }

    @Test
    @DisplayName("saveAvailabilities: aktif gun icin baslangic ve bitis saati zorunludur")
    void saveAvailabilities_enabledWithoutEndTime_throwsBeforeDeletingExistingRows() {
        ExpertAvailabilityDto dto = ExpertAvailabilityDto.builder()
                .dayOfWeek(1)
                .enabled(true)
                .startTime("09:00")
                .build();

        when(userRepository.findById(expertId)).thenReturn(Optional.of(expert));

        assertThatThrownBy(() -> appointmentService.saveAvailabilities(expertId, List.of(dto)))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Saat bilgisi zorunludur");

        verify(availabilityRepository, never()).deleteAll(any());
        verify(availabilityRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("saveAvailabilities: ayni gun iki kez kaydedilemez")
    void saveAvailabilities_duplicateDay_throwsBeforeDeletingExistingRows() {
        ExpertAvailabilityDto first = ExpertAvailabilityDto.builder()
                .dayOfWeek(2)
                .enabled(false)
                .build();
        ExpertAvailabilityDto duplicate = ExpertAvailabilityDto.builder()
                .dayOfWeek(2)
                .enabled(false)
                .build();

        when(userRepository.findById(expertId)).thenReturn(Optional.of(expert));

        assertThatThrownBy(() -> appointmentService.saveAvailabilities(expertId, List.of(first, duplicate)))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Ayni gun");

        verify(availabilityRepository, never()).deleteAll(any());
        verify(availabilityRepository, never()).saveAll(any());
    }
}
